import { Elysia } from "elysia";
import { Constant } from "./util/Constant";
import { Database } from "./database/Database";
import { Application } from "./Application";
import { AuthRepository } from "./repository/AuthRepository";
import { ErrorPlugin } from "./plugin/ErrorPlugin";
import { AuthorizationError, ConflictError } from "./util/Error";
import cors from "@elysiajs/cors";

const app = new Elysia({
  serve: {
    hostname: "0.0.0.0",
    // Nếu bạn muốn sử dụng HTTPS:
    // tls: {
    //   cert: Bun.file('path/to/cert.pem'),
    //   key: Bun.file('path/to/key.pem')
    // },
    maxRequestBodySize: 1024 * 1024 * 10, // Giới hạn kích thước body request là 10MB
  },
  // Các cấu hình khác nếu cần
})
  .use(cors())
  .use(ErrorPlugin)
  .use(Database)
  .get("/", () => {
    return "Welcome to Himmel!";
  })
  .group("/api", (app) => app.use(Application))
  .listen(3000);

console.log(
  `The app should be running at http://${app.server?.hostname}:${app.server?.port}`
);
