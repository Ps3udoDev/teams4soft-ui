/**
 * Compone un handler externo (del consumidor) con uno interno del componente.
 * El externo corre primero; si previene el default, el interno no se ejecuta
 * (salvo que checkForDefaultPrevented sea false).
 */
export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void,
  { checkForDefaultPrevented = true }: { checkForDefaultPrevented?: boolean } = {},
): (event: E) => void {
  return function handleEvent(event: E) {
    theirHandler?.(event);
    if (!checkForDefaultPrevented || !event.defaultPrevented) {
      ourHandler(event);
    }
  };
}
