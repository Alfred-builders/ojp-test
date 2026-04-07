import { toast } from "sonner";

/**
 * Wraps a Supabase mutation with error handling and toast feedback.
 * Returns `{ data, error: null }` on success or `{ data: null, error }` on failure.
 */
export async function mutate<T>(
  query: PromiseLike<{ data: T; error: { message: string } | null }>,
  errorMessage = "Une erreur est survenue",
  successMessage?: string
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  const { data, error } = await query;
  if (error) {
    toast.error(errorMessage);
    console.error(errorMessage, error.message);
    return { data: null, error: error.message };
  }
  if (successMessage) toast.success(successMessage);
  return { data, error: null };
}
