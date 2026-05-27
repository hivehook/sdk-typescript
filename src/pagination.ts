import type { ListOptions, PageInfo } from "./types.js";

export interface Page<T> {
  nodes: T[];
  pageInfo: PageInfo;
}

const DEFAULT_PAGE_SIZE = 100;

export async function* paginate<T, O extends ListOptions>(
  fetchPage: (options: O) => Promise<Page<T>>,
  options?: O
): AsyncGenerator<T, void, unknown> {
  const base = { ...(options ?? {}) } as O;
  const pageSize = base.first ?? base.limit ?? DEFAULT_PAGE_SIZE;
  let after = base.after;
  for (;;) {
    const page = await fetchPage({
      ...base,
      first: pageSize,
      limit: undefined,
      offset: undefined,
      after,
    } as O);
    for (const node of page.nodes) {
      yield node;
    }
    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) {
      return;
    }
    after = page.pageInfo.endCursor;
  }
}
