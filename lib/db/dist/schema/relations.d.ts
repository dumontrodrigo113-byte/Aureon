export declare const ordersRelations: import("drizzle-orm").Relations<"orders", {
    items: import("drizzle-orm").Many<"order_items">;
}>;
export declare const orderItemsRelations: import("drizzle-orm").Relations<"order_items", {
    order: import("drizzle-orm").One<"orders", true>;
}>;
//# sourceMappingURL=relations.d.ts.map