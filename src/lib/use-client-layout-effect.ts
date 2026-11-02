import * as React from "react";

/** `useLayoutEffect` en el cliente; en el servidor, `useEffect`, que no avisa bajo React 18. */
export const useClientLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;
