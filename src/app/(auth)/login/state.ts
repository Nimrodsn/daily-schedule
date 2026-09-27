/**
 * Kept out of actions.ts on purpose: every export of a "use server" module is
 * turned into a server reference, so a plain object exported from there would
 * not survive as data on the client.
 */
export type LoginState = {
  step: "email" | "code";
  email: string;
  error: string | null;
  notice: string | null;
};

export const initialLoginState: LoginState = {
  step: "email",
  email: "",
  error: null,
  notice: null,
};
