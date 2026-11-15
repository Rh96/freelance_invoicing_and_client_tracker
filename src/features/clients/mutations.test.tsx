import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { RepositoryProvider } from "@/data/repository-context";
import { testRepository } from "@/test/render-with-providers";
import { useCreateClient, useUpdateClient } from "./mutations";
import { clientKeys } from "./queries";

function setup() {
  const repository = testRepository();
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repository={repository}>
        {children}
      </RepositoryProvider>
    </QueryClientProvider>
  );
  return { repository, queryClient, wrapper };
}

const JANE = { name: "Jane Doe", email: "jane@doe.example" };

describe("client mutations", () => {
  it("creating marks the cached client list stale and caches the new client", async () => {
    const { repository, queryClient, wrapper } = setup();
    await queryClient.fetchQuery({
      queryKey: clientKeys.list(),
      queryFn: () => repository.listClients(),
    });
    const { result } = renderHook(() => useCreateClient(), { wrapper });

    const created = await act(() => result.current.mutateAsync(JANE));

    expect(queryClient.getQueryState(clientKeys.list())?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryData(clientKeys.detail(created.id))).toEqual(
      created,
    );
  });

  it("updating refreshes the cached client", async () => {
    const { repository, queryClient, wrapper } = setup();
    const jane = await repository.createClient(JANE);
    const { result } = renderHook(() => useUpdateClient(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        id: jane.id,
        input: { ...JANE, name: "Jane Roe" },
      }),
    );

    expect(queryClient.getQueryData(clientKeys.detail(jane.id))).toMatchObject({
      name: "Jane Roe",
    });
  });
});
