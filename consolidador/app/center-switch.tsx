// Seletor dos três centros do sistema. Só o Centro da Família existe hoje; Master e Admin
// aparecem desabilitados até haver perfis/permissões reais — o seletor nunca concede acesso.
export type Center = 'master' | 'admin' | 'familia';
const centers: { id: Center; label: string; hint: string }[] = [
  { id: 'master', label: 'Master', hint: 'Disponível para o perfil Master' },
  { id: 'admin', label: 'Admin', hint: 'Disponível para o perfil Admin' },
  { id: 'familia', label: 'Família', hint: 'Ambiente da família' },
];
export function CenterSwitch({ current = 'familia' }: { current?: Center }) {
  return (
    <nav className="center-switch" aria-label="Centros do sistema">
      {centers.map(c => c.id === current
        ? <span key={c.id} aria-current="page" title={c.hint}>{c.label}</span>
        : <span key={c.id} aria-disabled="true" title={c.hint}>{c.label}</span>)}
    </nav>
  );
}
