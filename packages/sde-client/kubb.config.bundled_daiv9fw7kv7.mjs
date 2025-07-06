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
      path: "http://sde.jita.space/latest/swagger.json"
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
        dataReturnType: "full"
      }),
      createSwaggerTS({}),
      createSwaggerTanstackQuery({
        client: {
          importPath: "../../client"
        },
        dataReturnType: "full"
      }),
      createSwaggerZod({}),
      createSwaggerZodios({})
    ]
  };
});
export {
  kubb_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsia3ViYi5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL1VzZXJzL2pvYW9tbG5ldG8vZ2l0L2ppdGFzcGFjZS9wYWNrYWdlcy9zZGUtY2xpZW50L2t1YmIuY29uZmlnLnRzXCI7Y29uc3QgX19pbmplY3RlZF9kaXJuYW1lX18gPSBcIi9Vc2Vycy9qb2FvbWxuZXRvL2dpdC9qaXRhc3BhY2UvcGFja2FnZXMvc2RlLWNsaWVudFwiO2NvbnN0IF9faW5qZWN0ZWRfaW1wb3J0X21ldGFfdXJsX18gPSBcImZpbGU6Ly8vVXNlcnMvam9hb21sbmV0by9naXQvaml0YXNwYWNlL3BhY2thZ2VzL3NkZS1jbGllbnQva3ViYi5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwiQGt1YmIvY29yZVwiO1xuaW1wb3J0IGNyZWF0ZVN3YWdnZXIgZnJvbSBcIkBrdWJiL3N3YWdnZXJcIjtcbmltcG9ydCBjcmVhdGVTd2FnZ2VyQ2xpZW50IGZyb20gXCJAa3ViYi9zd2FnZ2VyLWNsaWVudFwiO1xuaW1wb3J0IGNyZWF0ZVN3YWdnZXJUYW5zdGFja1F1ZXJ5IGZyb20gXCJAa3ViYi9zd2FnZ2VyLXRhbnN0YWNrLXF1ZXJ5XCI7XG5pbXBvcnQgY3JlYXRlU3dhZ2dlclRTIGZyb20gXCJAa3ViYi9zd2FnZ2VyLXRzXCI7XG5pbXBvcnQgY3JlYXRlU3dhZ2dlclpvZCBmcm9tIFwiQGt1YmIvc3dhZ2dlci16b2RcIjtcbmltcG9ydCBjcmVhdGVTd2FnZ2VyWm9kaW9zIGZyb20gXCJAa3ViYi9zd2FnZ2VyLXpvZGlvc1wiO1xuXG5cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyhhc3luYyAoKSA9PiB7XG4gIHJldHVybiB7XG4gICAgcm9vdDogXCIuXCIsXG4gICAgaW5wdXQ6IHtcbiAgICAgIHBhdGg6IFwiaHR0cDovL3NkZS5qaXRhLnNwYWNlL2xhdGVzdC9zd2FnZ2VyLmpzb25cIixcbiAgICB9LFxuICAgIG91dHB1dDoge1xuICAgICAgcGF0aDogXCIuL3NyYy9nZW5lcmF0ZWRcIixcbiAgICB9LFxuICAgIHBsdWdpbnM6IFtcbiAgICAgIGNyZWF0ZVN3YWdnZXIoe30pLFxuICAgICAgY3JlYXRlU3dhZ2dlckNsaWVudCh7XG4gICAgICAgIGNsaWVudDoge1xuICAgICAgICAgIGltcG9ydFBhdGg6IFwiLi4vLi4vY2xpZW50XCIsXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGFSZXR1cm5UeXBlOiBcImZ1bGxcIixcbiAgICAgIH0pLFxuICAgICAgY3JlYXRlU3dhZ2dlclRTKHt9KSxcbiAgICAgIGNyZWF0ZVN3YWdnZXJUYW5zdGFja1F1ZXJ5KHtcbiAgICAgICAgY2xpZW50OiB7XG4gICAgICAgICAgaW1wb3J0UGF0aDogXCIuLi8uLi9jbGllbnRcIixcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YVJldHVyblR5cGU6IFwiZnVsbFwiLFxuICAgICAgfSksXG4gICAgICBjcmVhdGVTd2FnZ2VyWm9kKHt9KSxcbiAgICAgIGNyZWF0ZVN3YWdnZXJab2Rpb3Moe30pLFxuICAgIF0sXG4gIH07XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVMsU0FBUyxvQkFBb0I7QUFDcFUsT0FBTyxtQkFBbUI7QUFDMUIsT0FBTyx5QkFBeUI7QUFDaEMsT0FBTyxnQ0FBZ0M7QUFDdkMsT0FBTyxxQkFBcUI7QUFDNUIsT0FBTyxzQkFBc0I7QUFDN0IsT0FBTyx5QkFBeUI7QUFNaEMsSUFBTyxzQkFBUSxhQUFhLFlBQVk7QUFDdEMsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsTUFBTTtBQUFBLElBQ1I7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxJQUNSO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxjQUFjLENBQUMsQ0FBQztBQUFBLE1BQ2hCLG9CQUFvQjtBQUFBLFFBQ2xCLFFBQVE7QUFBQSxVQUNOLFlBQVk7QUFBQSxRQUNkO0FBQUEsUUFDQSxnQkFBZ0I7QUFBQSxNQUNsQixDQUFDO0FBQUEsTUFDRCxnQkFBZ0IsQ0FBQyxDQUFDO0FBQUEsTUFDbEIsMkJBQTJCO0FBQUEsUUFDekIsUUFBUTtBQUFBLFVBQ04sWUFBWTtBQUFBLFFBQ2Q7QUFBQSxRQUNBLGdCQUFnQjtBQUFBLE1BQ2xCLENBQUM7QUFBQSxNQUNELGlCQUFpQixDQUFDLENBQUM7QUFBQSxNQUNuQixvQkFBb0IsQ0FBQyxDQUFDO0FBQUEsSUFDeEI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
