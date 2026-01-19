# Developer Guide - Getting Started

This guide is for developers who need to extend or maintain the D365 F&O Data Agent codebase.

## Target Audience

This guide assumes you are:
- **Not a frontend specialist** but can read and modify React code
- Comfortable with TypeScript/JavaScript
- Familiar with SQL and databases
- Able to follow code patterns and examples

## Environment Configuration

### LLM Model Configuration

The system uses OpenAI-compatible models for query generation. Default configuration:

**Model Selection** (`.env`):
```bash
# Default Model (Recommended)
LLM_MODEL=gpt-5.1-2025-11-13

# Alternative Models
# LLM_MODEL=gpt-4o           # Balanced performance
# LLM_MODEL=gpt-4o-mini      # Lower cost, faster
# LLM_MODEL=claude-3.5-haiku # Anthropic alternative
# LLM_MODEL=gemini-3-flash   # Google (not recommended due to repetition issues)
```

**Model Pricing** (as of Jan 2026):

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Notes |
|-------|----------------------|------------------------|-------|
| GPT-5.1-2025-11-13 | $2.50 | $10.00 | Default, best performance |
| GPT-4o | $2.50 | $10.00 | Stable, reliable |
| GPT-4o-mini | $0.15 | $0.60 | Budget-friendly |
| Claude-3.5-haiku | $0.25 | $1.25 | Fast, efficient |
| Gemini-3-flash | $0.10 | $0.10 | Not recommended (repetition issues) |

**Token Usage Tracking**:
The system automatically tracks and displays token usage and cost estimates in the UI.

### Required Environment Variables

```bash
# LLM Configuration
LLM_MODEL=gpt-5.1-2025-11-13
OPENAI_API_KEY=your_api_key_here

# Database (Internal)
DATABASE_URL=mysql://user:pass@localhost:3306/d365agent

# Azure SQL (D365 Database)
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=your_database
AZURE_SQL_USER=your_user
AZURE_SQL_PASSWORD=your_password

# Azure AD Authentication (Optional)
AZURE_AD_CLIENT_ID=your_client_id
AZURE_AD_CLIENT_SECRET=your_client_secret
AZURE_AD_TENANT_ID=your_tenant_id

# RAG Configuration
ENABLE_RAG=true
ENABLE_KEYWORD_FALLBACK=true
ENABLE_METADATA_FALLBACK=true
```

### Model Configuration Tips

**For Production**:
- Use GPT-5.1 or GPT-4o for best accuracy
- Enable token usage tracking to monitor costs
- Set appropriate rate limits

**For Development**:
- GPT-4o-mini provides good balance of speed and cost
- Lower token usage for faster iteration

**For Testing**:
- Use fixed test prompts to ensure consistency
- Compare model outputs side-by-side

## Core Concepts

### tRPC: Type-Safe API

tRPC eliminates the need for REST endpoints and manual API clients. Types flow automatically from server to client.

**Traditional REST Approach** (NOT used):
```typescript
// Server
app.post("/api/users", (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});

// Client
const response = await fetch("/api/users", {
  method: "POST",
  body: JSON.stringify({ name: "John" }),
});
const user = await response.json(); // Type unknown!
```

**tRPC Approach** (USED):
```typescript
// Server (server/routers.ts)
users: router({
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      return await createUser(input);
    }),
}),

// Client (automatic type inference!)
const createUser = trpc.users.create.useMutation();
createUser.mutate({ name: "John" }); // Fully typed!
```

### Drizzle ORM: Type-Safe Database

Drizzle provides type-safe database queries without writing SQL.

**Schema Definition** (`drizzle/schema.ts`):
```typescript
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
```

**Query Helpers** (`server/db.ts`):
```typescript
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result[0];
}
```

## CRUD Operations Guide

### Create (Insert)

**1. Define Schema** (`drizzle/schema.ts`):
```typescript
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  price: int("price").notNull(), // Store as cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
```

**2. Push Schema**:
```bash
pnpm db:push
```

**3. Add Database Helper** (`server/db.ts`):
```typescript
export async function createProduct(product: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(products).values(product);
  return result.insertId;
}
```

**4. Add tRPC Procedure** (`server/routers.ts`):
```typescript
products: router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      price: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const id = await createProduct(input);
      return { id, ...input };
    }),
}),
```

**5. Use in Frontend**:
```typescript
const createProduct = trpc.products.create.useMutation({
  onSuccess: () => {
    toast.success("Product created!");
  },
});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  createProduct.mutate({ name: "Widget", price: 1999 });
};
```

### Read (Select)

**List All**:
```typescript
// server/db.ts
export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products);
}

// server/routers.ts
products: router({
  list: protectedProcedure.query(async () => {
    return await getAllProducts();
  }),
}),

// Frontend
const { data: products } = trpc.products.list.useQuery();
```

**Get By ID**:
```typescript
// server/db.ts
export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  return result[0];
}

// server/routers.ts
products: router({
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getProductById(input.id);
    }),
}),

// Frontend
const { data: product } = trpc.products.getById.useQuery({ id: 123 });
```

**Filter/Search**:
```typescript
// server/db.ts
import { like } from "drizzle-orm";

export async function searchProducts(query: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(products)
    .where(like(products.name, `%${query}%`));
}

// server/routers.ts
products: router({
  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      return await searchProducts(input.query);
    }),
}),

// Frontend
const [searchQuery, setSearchQuery] = useState("");
const { data: results } = trpc.products.search.useQuery({ query: searchQuery });
```

### Update

**Full Update**:
```typescript
// server/db.ts
export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(products)
    .set(data)
    .where(eq(products.id, id));
}

// server/routers.ts
products: router({
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      price: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateProduct(id, data);
      return { success: true };
    }),
}),

// Frontend
const updateProduct = trpc.products.update.useMutation({
  onSuccess: () => {
    toast.success("Product updated!");
    // Invalidate cache to refetch
    trpc.useUtils().products.list.invalidate();
  },
});

updateProduct.mutate({ id: 123, name: "New Name" });
```

### Delete

**Single Delete**:
```typescript
// server/db.ts
export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(products).where(eq(products.id, id));
}

// server/routers.ts
products: router({
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteProduct(input.id);
      return { success: true };
    }),
}),

// Frontend
const deleteProduct = trpc.products.delete.useMutation({
  onSuccess: () => {
    toast.success("Product deleted!");
    trpc.useUtils().products.list.invalidate();
  },
});

deleteProduct.mutate({ id: 123 });
```

## Common Patterns

### Pagination

```typescript
// server/db.ts
export async function getProductsPaginated(page: number, pageSize: number) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const offset = (page - 1) * pageSize;

  const [items, totalResult] = await Promise.all([
    db.select().from(products).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(products),
  ]);

  return {
    items,
    total: totalResult[0]?.count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((totalResult[0]?.count || 0) / pageSize),
  };
}

// server/routers.ts
products: router({
  listPaginated: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
    }))
    .query(async ({ input }) => {
      return await getProductsPaginated(input.page, input.pageSize);
    }),
}),

// Frontend
const [page, setPage] = useState(1);
const { data } = trpc.products.listPaginated.useQuery({ page, pageSize: 20 });

// data.items, data.total, data.totalPages
```

### Sorting

```typescript
// server/db.ts
import { asc, desc } from "drizzle-orm";

export async function getProductsSorted(
  sortBy: "name" | "price" | "createdAt",
  order: "asc" | "desc"
) {
  const db = await getDb();
  if (!db) return [];

  const orderFn = order === "asc" ? asc : desc;

  return await db
    .select()
    .from(products)
    .orderBy(orderFn(products[sortBy]));
}
```

### Joins (Relationships)

```typescript
// drizzle/schema.ts
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  total: int("total").notNull(),
});

// server/db.ts
export async function getOrdersWithUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      order: orders,
      user: users,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id));
}
```

### Transactions

```typescript
// server/db.ts
export async function transferFunds(fromId: number, toId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async (tx) => {
    // Deduct from sender
    await tx
      .update(accounts)
      .set({ balance: sql`balance - ${amount}` })
      .where(eq(accounts.id, fromId));

    // Add to receiver
    await tx
      .update(accounts)
      .set({ balance: sql`balance + ${amount}` })
      .where(eq(accounts.id, toId));
  });
}
```

## Frontend Patterns

### Optimistic Updates

For instant UI feedback before server confirmation:

```typescript
const deleteProduct = trpc.products.delete.useMutation({
  onMutate: async ({ id }) => {
    // Cancel outgoing refetches
    await trpc.useUtils().products.list.cancel();

    // Snapshot current data
    const previous = trpc.useUtils().products.list.getData();

    // Optimistically update cache
    trpc.useUtils().products.list.setData(undefined, (old) =>
      old?.filter((p) => p.id !== id)
    );

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previous) {
      trpc.useUtils().products.list.setData(undefined, context.previous);
    }
    toast.error("Failed to delete product");
  },
  onSettled: () => {
    // Refetch to sync with server
    trpc.useUtils().products.list.invalidate();
  },
});
```

### Loading States

```typescript
const { data, isLoading, error } = trpc.products.list.useQuery();

if (isLoading) {
  return <div>Loading...</div>;
}

if (error) {
  return <div>Error: {error.message}</div>;
}

return <div>{data.map(...)}</div>;
```

### Form Handling

```typescript
const [formData, setFormData] = useState({ name: "", price: 0 });

const createProduct = trpc.products.create.useMutation({
  onSuccess: () => {
    setFormData({ name: "", price: 0 }); // Reset form
    toast.success("Product created!");
  },
});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  createProduct.mutate(formData);
};

return (
  <form onSubmit={handleSubmit}>
    <input
      value={formData.name}
      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    />
    <button disabled={createProduct.isPending}>
      {createProduct.isPending ? "Creating..." : "Create"}
    </button>
  </form>
);
```

## Testing

### Unit Test Example

```typescript
// server/products.test.ts
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("products.create", () => {
  it("creates a product with valid input", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.products.create({
      name: "Test Product",
      price: 1999,
    });

    expect(result).toHaveProperty("id");
    expect(result.name).toBe("Test Product");
  });

  it("rejects invalid price", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.products.create({ name: "Test", price: -100 })
    ).rejects.toThrow();
  });
});
```

## Best Practices

### 1. Always Use Parameterized Queries

**Bad** (SQL injection risk):
```typescript
await db.execute(`SELECT * FROM users WHERE name = '${name}'`);
```

**Good**:
```typescript
await db.select().from(users).where(eq(users.name, name));
```

### 2. Handle Database Unavailability

```typescript
export async function getUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("Database not available");
    return []; // Return empty array, not undefined
  }
  return await db.select().from(users);
}
```

### 3. Use Zod for Input Validation

```typescript
// Bad - no validation
.input(z.any())

// Good - strict validation
.input(z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
}))
```

### 4. Invalidate Cache After Mutations

```typescript
const createProduct = trpc.products.create.useMutation({
  onSuccess: () => {
    // Refetch product list
    trpc.useUtils().products.list.invalidate();
  },
});
```

### 5. Use Protected Procedures for Authenticated Endpoints

```typescript
// Public (no auth required)
publicProcedure.query(...)

// Protected (requires authentication)
protectedProcedure.query(({ ctx }) => {
  const userId = ctx.user.id; // Guaranteed to exist
  ...
})
```

## Common Pitfalls

### 1. Forgetting to Push Schema Changes

After modifying `drizzle/schema.ts`, always run:
```bash
pnpm db:push
```

### 2. Not Handling Loading States

```typescript
// Bad
const { data } = trpc.products.list.useQuery();
return <div>{data.map(...)}</div>; // Crashes if data is undefined!

// Good
const { data, isLoading } = trpc.products.list.useQuery();
if (isLoading) return <div>Loading...</div>;
return <div>{data?.map(...) || []}</div>;
```

### 3. Infinite Re-renders from Unstable References

```typescript
// Bad - new object every render
const { data } = trpc.products.search.useQuery({
  filters: { name: "test" }, // New object reference!
});

// Good - stable reference
const filters = useMemo(() => ({ name: "test" }), []);
const { data } = trpc.products.search.useQuery({ filters });
```

### 4. Not Using Transactions for Related Updates

```typescript
// Bad - partial failure possible
await updateOrder(orderId, { status: "shipped" });
await createShipment(orderId);

// Good - all or nothing
await db.transaction(async (tx) => {
  await tx.update(orders).set({ status: "shipped" }).where(eq(orders.id, orderId));
  await tx.insert(shipments).values({ orderId });
});
```

## Next Steps

- [Architecture Overview](../architecture/system-overview.md)
- [Deployment Guide](../deployment/local-setup.md)
- [API Documentation](../api/trpc-procedures.md)
- [User Guide](../usage/user-guide.md)
