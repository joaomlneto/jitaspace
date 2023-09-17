import { Category, prisma } from "@jitaspace/db";
import {
  getUniverseCategories,
  getUniverseCategoriesCategoryId,
  GetUniverseCategoriesCategoryId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeCategoriesEventPayload = {
  data: {};
};

export const scrapeEsiCategories = inngest.createFunction(
  { name: "Scrape Categories" },
  { event: "scrape/esi/categories" },
  async ({ logger }) => {
    // Get all Category IDs in ESI
    const { data: categoryIds } = await getUniverseCategories();
    logger.info(`going to fetch ${categoryIds.length} entries`);

    // Get all Category details from ESI
    const fetchESIDetailsStartTime = performance.now();
    const categoriesResponses = await Promise.all(
      categoryIds.map(async (categoryId) =>
        getUniverseCategoriesCategoryId(categoryId),
      ),
    );
    logger.info(
      `fetched entries in ${performance.now() - fetchESIDetailsStartTime}`,
    );

    // extract bodies
    const categories = categoriesResponses.map((res) => res.data);

    // determine which records to be created/updated/removed
    const existingIdsInDb = await prisma.category
      .findMany({
        select: {
          categoryId: true,
        },
      })
      .then((categories) => categories.map((category) => category.categoryId));

    const recordsToCreate = categories.filter(
      (category) => !existingIdsInDb.includes(category.category_id),
    );
    const recordsToUpdate = categories.filter((category) =>
      existingIdsInDb.includes(category.category_id),
    );
    const recordsToDelete = existingIdsInDb.filter(
      (categoryId) => !categoryIds.includes(categoryId),
    );

    logger.info("records to create:", recordsToCreate.length);
    logger.info("records to update:", recordsToUpdate.length);
    logger.info("records to delete:", recordsToDelete.length);

    const fromEsiToSchema = (
      category: GetUniverseCategoriesCategoryId200,
    ): Omit<Category, "updatedAt"> => ({
      categoryId: category.category_id,
      name: category.name,
      published: category.published,
      isDeleted: false,
    });

    // create missing entries
    const createRecordsStartTime = performance.now();
    const createResult = await prisma.category.createMany({
      data: recordsToCreate.map(fromEsiToSchema),
      skipDuplicates: true,
    });
    logger.info(
      `created records in ${performance.now() - createRecordsStartTime}ms`,
    );

    // update all entries with new data
    const updateRecordsStartTime = performance.now();
    const updateResult = await Promise.all(
      recordsToUpdate.map((category) =>
        prisma.category.update({
          data: fromEsiToSchema(category),
          where: { categoryId: category.category_id },
        }),
      ),
    );
    logger.info(
      `updated records in ${performance.now() - updateRecordsStartTime}ms`,
    );

    // mark records as deleted if missing from ESI
    const deleteRecordsStartTime = performance.now();
    const deleteResult = await prisma.category.updateMany({
      data: {
        isDeleted: true,
      },
      where: {
        categoryId: {
          in: recordsToDelete,
        },
      },
    });
    logger.info(
      `deleted records in ${performance.now() - deleteRecordsStartTime}ms`,
    );

    return {
      numCreated: createResult.count,
      numUpdated: updateResult.length,
      numDeleted: deleteResult.count,
    };
  },
);
