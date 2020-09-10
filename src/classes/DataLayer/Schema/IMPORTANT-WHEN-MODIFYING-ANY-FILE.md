See notes in top of ../CacheSchema.ts!

In addition, new fields should be created as "SomeTypeForTheField | undefined",
since old data in the database/cache may not have the field.
