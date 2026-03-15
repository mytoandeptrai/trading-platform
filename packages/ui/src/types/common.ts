import { FC, PropsWithChildren } from "react";

export type FCC<P = Record<string, never>> = FC<PropsWithChildren<P>>;

export type TOptional<T> = T | undefined;
