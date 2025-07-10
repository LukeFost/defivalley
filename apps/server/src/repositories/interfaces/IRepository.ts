export interface IRepository<T, ID> {
  findById(id: ID): T | undefined;
  findAll(): T[];
  save(entity: T): void;
  delete(id: ID): void;
  exists(id: ID): boolean;
}