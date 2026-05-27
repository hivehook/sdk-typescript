import type { Bookmark, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export interface CreateBookmarkInput {
  eventId: string;
  name?: string;
  notes?: string;
}

export interface ListBookmarksOptions extends ListOptions {
  eventId?: string;
}

const BOOKMARK_FRAGMENT = `
  id
  eventId
  name
  notes
  createdAt
`;

const LIST_QUERY = `
  query ListBookmarks($eventId: UUID, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    bookmarks(eventId: $eventId, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${BOOKMARK_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetBookmark($id: UUID!) {
    bookmark(id: $id) { ${BOOKMARK_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateBookmark($eventId: UUID!, $name: String, $notes: String) {
    createBookmark(eventId: $eventId, name: $name, notes: $notes) { ${BOOKMARK_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteBookmark($id: UUID!) {
    deleteBookmark(id: $id)
  }
`;

export class BookmarkService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListBookmarksOptions): Promise<{ nodes: Bookmark[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.eventId !== undefined) variables.eventId = options.eventId;
    }
    const data = await this.transport.execute<{ bookmarks: { nodes: Bookmark[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.bookmarks;
  }

  async get(id: string): Promise<Bookmark | null> {
    const data = await this.transport.execute<{ bookmark: Bookmark | null }>(GET_QUERY, { id });
    return data.bookmark;
  }

  async create(input: CreateBookmarkInput): Promise<Bookmark> {
    const data = await this.transport.execute<{ createBookmark: Bookmark }>(CREATE_MUTATION, { ...input });
    return data.createBookmark;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteBookmark: boolean }>(DELETE_MUTATION, { id });
    return data.deleteBookmark;
  }

  iterate(options?: ListBookmarksOptions): AsyncGenerator<Bookmark, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
