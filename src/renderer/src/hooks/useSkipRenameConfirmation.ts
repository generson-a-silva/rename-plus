import { useCallback, useEffect, useState } from "react";

/**
 * Preferência "renomear sem a janela de confirmação", guardada pelo processo principal
 * junto das demais configurações. Começa em `false` até a leitura chegar.
 */
export function useSkipRenameConfirmation(): [boolean, (skip: boolean) => void] {
	const [skip, setSkip] = useState(false);

	useEffect(() => {
		void window.api.getSkipRenameConfirmation().then(setSkip);
	}, []);

	const update = useCallback((value: boolean) => {
		setSkip(value);
		void window.api.setSkipRenameConfirmation(value).then(setSkip);
	}, []);

	return [skip, update];
}
