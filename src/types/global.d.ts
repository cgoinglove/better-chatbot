

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type Mutate<T> = Partial<T> | ((prev: T) => Partial<T>);

type Override<T, R> = Omit<T, keyof R> & R;

type ValueOf<T> = T[keyof T];

type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | { [key: string]: JsonValue };

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};


