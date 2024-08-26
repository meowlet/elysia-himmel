import Elysia, { t } from "elysia";

export const AuthModel = new Elysia().model({
  signIn: t.Object({
    identifier: t.String(),
    password: t.String(),
  }),
  signUp: t.Object({
    email: t.String(),
    username: t.String(),
    password: t.String(),
  }),
});
