'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MembersSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const status = searchParams.get('status') || 'all';

  const updateSearchParams = (newParams: Record<string, string | null>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(newParams)) {
        if (value === null || value === '' || value === 'all') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      router.push(`/dashboard/members?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams({ q: query });
  };

  const handleStatusChange = (newStatus: string) => {
    updateSearchParams({ status: newStatus });
  };

  const handleClearFilters = () => {
    setQuery('');
    updateSearchParams({ q: null, status: null });
  };

  const hasFilters = query || status !== 'all';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <form onSubmit={handleSearch} className="flex flex-1 gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            type="search"
            placeholder="Rechercher par nom, email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Recherche...' : 'Rechercher'}
        </Button>
      </form>

      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Statut:{' '}
              {status === 'all'
                ? 'Tous'
                : status === 'active'
                  ? 'Actifs'
                  : status === 'inactive'
                    ? 'Inactifs'
                    : 'Suspendus'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={status} onValueChange={handleStatusChange}>
              <DropdownMenuRadioItem value="all">Tous</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="active">Actifs</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="inactive">Inactifs</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="suspended">Suspendus</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilters && (
          <Button variant="ghost" onClick={handleClearFilters}>
            Effacer
          </Button>
        )}
      </div>
    </div>
  );
}
