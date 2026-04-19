// Factions module — public API
export type { Faction, FactionData } from './types';
export { isFaction } from './types';
export { useFactions } from './hooks/useFactions';
export { useFactionById } from './hooks/useFactionById';
export type { FactionFormValues } from './components/FactionForm';
export { FactionForm } from './components/FactionForm';
export { FactionCard } from './components/FactionCard';
export { FactionList } from './components/FactionList';
export { FactionDetail } from './components/FactionDetail';

