import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRepository } from "@/data/repository-context";
import type { Client, ClientInput } from "@/domain/client";
import { clientKeys } from "./queries";

function useOnClientSaved() {
  const queryClient = useQueryClient();
  return async (client: Client) => {
    queryClient.setQueryData(clientKeys.detail(client.id), client);
    await queryClient.invalidateQueries({ queryKey: clientKeys.all });
  };
}

export function useCreateClient() {
  const repository = useRepository();
  const onSaved = useOnClientSaved();
  return useMutation({
    mutationFn: (input: ClientInput) => repository.createClient(input),
    onSuccess: onSaved,
  });
}

export function useUpdateClient() {
  const repository = useRepository();
  const onSaved = useOnClientSaved();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientInput }) =>
      repository.updateClient(id, input),
    onSuccess: onSaved,
  });
}

export function useArchiveClient() {
  const repository = useRepository();
  const onSaved = useOnClientSaved();
  return useMutation({
    mutationFn: (id: string) => repository.archiveClient(id),
    onSuccess: onSaved,
  });
}
