/* eslint-disable react/prop-types -- props typed via TypeScript FCC<{ when?: boolean }> */
import type { FCC } from '@repo/ui/types/common';

export const Show: FCC<{ when?: boolean }> = (props) => {
  return <>{props.when ? <>{props.children}</> : null}</>;
};
