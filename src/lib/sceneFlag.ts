// Shared mutable flag — no imports from scene/ui components
// Avoids circular dependency between ui/PageBackground and scenes/PageBackground
export const layoutBgSuppressed: { value: boolean } = { value: false };
