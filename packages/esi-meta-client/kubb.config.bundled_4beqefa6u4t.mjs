// kubb.config.ts
import { defineConfig } from "@kubb/core";
import createSwagger from "@kubb/swagger";
import createSwaggerClient from "@kubb/swagger-client";
import createSwaggerTanstackQuery from "@kubb/swagger-tanstack-query";
import createSwaggerTS from "@kubb/swagger-ts";
import createSwaggerZod from "@kubb/swagger-zod";
import createSwaggerZodios from "@kubb/swagger-zodios";
var kubb_config_default = defineConfig(async () => {
  return {
    root: ".",
    input: {
      path: "https://esi.evetech.net/swagger.json"
    },
    output: {
      path: "./src/generated"
    },
    plugins: [
      createSwagger({}),
      createSwaggerClient({
        client: {
          importPath: "../../client"
        },
        dataReturnType: "full",
        exclude: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" }
        ]
      }),
      createSwaggerTS({
        exclude: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" }
        ]
      }),
      createSwaggerTanstackQuery({
        client: {
          importPath: "../../client"
        },
        dataReturnType: "full",
        exclude: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" }
        ]
      }),
      createSwaggerZod({
        exclude: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" }
        ]
      }),
      createSwaggerZodios({})
    ]
  };
});
export {
  kubb_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsia3ViYi5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL1VzZXJzL2pvYW9tbG5ldG8vZ2l0L2ppdGFzcGFjZS9wYWNrYWdlcy9lc2ktbWV0YS1jbGllbnQva3ViYi5jb25maWcudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiL1VzZXJzL2pvYW9tbG5ldG8vZ2l0L2ppdGFzcGFjZS9wYWNrYWdlcy9lc2ktbWV0YS1jbGllbnRcIjtjb25zdCBfX2luamVjdGVkX2ltcG9ydF9tZXRhX3VybF9fID0gXCJmaWxlOi8vL1VzZXJzL2pvYW9tbG5ldG8vZ2l0L2ppdGFzcGFjZS9wYWNrYWdlcy9lc2ktbWV0YS1jbGllbnQva3ViYi5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwiQGt1YmIvY29yZVwiO1xuaW1wb3J0IGNyZWF0ZVN3YWdnZXIgZnJvbSBcIkBrdWJiL3N3YWdnZXJcIjtcbmltcG9ydCBjcmVhdGVTd2FnZ2VyQ2xpZW50IGZyb20gXCJAa3ViYi9zd2FnZ2VyLWNsaWVudFwiO1xuaW1wb3J0IGNyZWF0ZVN3YWdnZXJUYW5zdGFja1F1ZXJ5IGZyb20gXCJAa3ViYi9zd2FnZ2VyLXRhbnN0YWNrLXF1ZXJ5XCI7XG5pbXBvcnQgY3JlYXRlU3dhZ2dlclRTIGZyb20gXCJAa3ViYi9zd2FnZ2VyLXRzXCI7XG5pbXBvcnQgY3JlYXRlU3dhZ2dlclpvZCBmcm9tIFwiQGt1YmIvc3dhZ2dlci16b2RcIjtcbmltcG9ydCBjcmVhdGVTd2FnZ2VyWm9kaW9zIGZyb20gXCJAa3ViYi9zd2FnZ2VyLXpvZGlvc1wiO1xuXG5cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyhhc3luYyAoKSA9PiB7XG4gIHJldHVybiB7XG4gICAgcm9vdDogXCIuXCIsXG4gICAgaW5wdXQ6IHtcbiAgICAgIHBhdGg6IFwiaHR0cHM6Ly9lc2kuZXZldGVjaC5uZXQvc3dhZ2dlci5qc29uXCIsXG4gICAgfSxcbiAgICBvdXRwdXQ6IHtcbiAgICAgIHBhdGg6IFwiLi9zcmMvZ2VuZXJhdGVkXCIsXG4gICAgfSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICBjcmVhdGVTd2FnZ2VyKHt9KSxcbiAgICAgIGNyZWF0ZVN3YWdnZXJDbGllbnQoe1xuICAgICAgICBjbGllbnQ6IHtcbiAgICAgICAgICBpbXBvcnRQYXRoOiBcIi4uLy4uL2NsaWVudFwiLFxuICAgICAgICB9LFxuICAgICAgICBkYXRhUmV0dXJuVHlwZTogXCJmdWxsXCIsXG4gICAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgICB7IHR5cGU6IFwidGFnXCIsIHBhdHRlcm46IFwiU3dhZ2dlclwiIH0sXG4gICAgICAgICAgeyB0eXBlOiBcInRhZ1wiLCBwYXR0ZXJuOiBcIldlYlVJXCIgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pLFxuICAgICAgY3JlYXRlU3dhZ2dlclRTKHtcbiAgICAgICAgZXhjbHVkZTogW1xuICAgICAgICAgIHsgdHlwZTogXCJ0YWdcIiwgcGF0dGVybjogXCJTd2FnZ2VyXCIgfSxcbiAgICAgICAgICB7IHR5cGU6IFwidGFnXCIsIHBhdHRlcm46IFwiV2ViVUlcIiB9LFxuICAgICAgICBdLFxuICAgICAgfSksXG4gICAgICBjcmVhdGVTd2FnZ2VyVGFuc3RhY2tRdWVyeSh7XG4gICAgICAgIGNsaWVudDoge1xuICAgICAgICAgIGltcG9ydFBhdGg6IFwiLi4vLi4vY2xpZW50XCIsXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGFSZXR1cm5UeXBlOiBcImZ1bGxcIixcbiAgICAgICAgZXhjbHVkZTogW1xuICAgICAgICAgIHsgdHlwZTogXCJ0YWdcIiwgcGF0dGVybjogXCJTd2FnZ2VyXCIgfSxcbiAgICAgICAgICB7IHR5cGU6IFwidGFnXCIsIHBhdHRlcm46IFwiV2ViVUlcIiB9LFxuICAgICAgICBdLFxuICAgICAgfSksXG4gICAgICBjcmVhdGVTd2FnZ2VyWm9kKHtcbiAgICAgICAgZXhjbHVkZTogW1xuICAgICAgICAgIHsgdHlwZTogXCJ0YWdcIiwgcGF0dGVybjogXCJTd2FnZ2VyXCIgfSxcbiAgICAgICAgICB7IHR5cGU6IFwidGFnXCIsIHBhdHRlcm46IFwiV2ViVUlcIiB9LFxuICAgICAgICBdLFxuICAgICAgfSksXG4gICAgICBjcmVhdGVTd2FnZ2VyWm9kaW9zKHt9KSxcbiAgICBdLFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNULFNBQVMsb0JBQW9CO0FBQ25WLE9BQU8sbUJBQW1CO0FBQzFCLE9BQU8seUJBQXlCO0FBQ2hDLE9BQU8sZ0NBQWdDO0FBQ3ZDLE9BQU8scUJBQXFCO0FBQzVCLE9BQU8sc0JBQXNCO0FBQzdCLE9BQU8seUJBQXlCO0FBTWhDLElBQU8sc0JBQVEsYUFBYSxZQUFZO0FBQ3RDLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLE1BQU07QUFBQSxJQUNSO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsSUFDUjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsY0FBYyxDQUFDLENBQUM7QUFBQSxNQUNoQixvQkFBb0I7QUFBQSxRQUNsQixRQUFRO0FBQUEsVUFDTixZQUFZO0FBQUEsUUFDZDtBQUFBLFFBQ0EsZ0JBQWdCO0FBQUEsUUFDaEIsU0FBUztBQUFBLFVBQ1AsRUFBRSxNQUFNLE9BQU8sU0FBUyxVQUFVO0FBQUEsVUFDbEMsRUFBRSxNQUFNLE9BQU8sU0FBUyxRQUFRO0FBQUEsUUFDbEM7QUFBQSxNQUNGLENBQUM7QUFBQSxNQUNELGdCQUFnQjtBQUFBLFFBQ2QsU0FBUztBQUFBLFVBQ1AsRUFBRSxNQUFNLE9BQU8sU0FBUyxVQUFVO0FBQUEsVUFDbEMsRUFBRSxNQUFNLE9BQU8sU0FBUyxRQUFRO0FBQUEsUUFDbEM7QUFBQSxNQUNGLENBQUM7QUFBQSxNQUNELDJCQUEyQjtBQUFBLFFBQ3pCLFFBQVE7QUFBQSxVQUNOLFlBQVk7QUFBQSxRQUNkO0FBQUEsUUFDQSxnQkFBZ0I7QUFBQSxRQUNoQixTQUFTO0FBQUEsVUFDUCxFQUFFLE1BQU0sT0FBTyxTQUFTLFVBQVU7QUFBQSxVQUNsQyxFQUFFLE1BQU0sT0FBTyxTQUFTLFFBQVE7QUFBQSxRQUNsQztBQUFBLE1BQ0YsQ0FBQztBQUFBLE1BQ0QsaUJBQWlCO0FBQUEsUUFDZixTQUFTO0FBQUEsVUFDUCxFQUFFLE1BQU0sT0FBTyxTQUFTLFVBQVU7QUFBQSxVQUNsQyxFQUFFLE1BQU0sT0FBTyxTQUFTLFFBQVE7QUFBQSxRQUNsQztBQUFBLE1BQ0YsQ0FBQztBQUFBLE1BQ0Qsb0JBQW9CLENBQUMsQ0FBQztBQUFBLElBQ3hCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
