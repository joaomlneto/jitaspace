export type NoOptionals<T> = {
  [P in keyof T]-?: T[P];
};
