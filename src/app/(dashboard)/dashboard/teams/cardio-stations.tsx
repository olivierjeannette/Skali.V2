'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dumbbell,
  Plus,
  Trash2,
  Settings2,
  Loader2,
  Bike,
  Ship,
  PersonStanding,
  Activity,
} from 'lucide-react';
import {
  createCardioStation,
  bulkCreateCardioStations,
  deleteCardioStation,
  type CardioStation,
} from '@/actions/teams';
import { useRouter } from 'next/navigation';

// Cardio station types
const CARDIO_STATION_TYPES = [
  { value: 'rower', label: 'Rower' },
  { value: 'assault_bike', label: 'Assault Bike' },
  { value: 'echo_bike', label: 'Echo Bike' },
  { value: 'ski_erg', label: 'Ski Erg' },
  { value: 'bike_erg', label: 'Bike Erg' },
  { value: 'treadmill', label: 'Treadmill' },
  { value: 'other', label: 'Autre' },
] as const;

interface CardioStationManagerProps {
  stations: CardioStation[];
}

// Icons for station types
const STATION_ICONS: Record<string, React.ReactNode> = {
  rower: <Ship className="h-4 w-4" />,
  assault_bike: <Bike className="h-4 w-4" />,
  echo_bike: <Bike className="h-4 w-4" />,
  ski_erg: <PersonStanding className="h-4 w-4" />,
  bike_erg: <Bike className="h-4 w-4" />,
  treadmill: <Activity className="h-4 w-4" />,
  other: <Dumbbell className="h-4 w-4" />,
};

export function CardioStationManager({ stations }: CardioStationManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  // Single station form
  const [stationType, setStationType] = useState('rower');
  const [stationName, setStationName] = useState('');

  // Bulk form
  const [bulkType, setBulkType] = useState('rower');
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkPrefix, setBulkPrefix] = useState('');

  // Group stations by type
  const stationsByType = stations.reduce((acc, station) => {
    if (!acc[station.type]) {
      acc[station.type] = [];
    }
    acc[station.type].push(station);
    return acc;
  }, {} as Record<string, CardioStation[]>);

  // Create single station
  const handleCreateStation = () => {
    if (!stationName.trim()) return;

    startTransition(async () => {
      const result = await createCardioStation({
        type: stationType,
        name: stationName.trim(),
      });

      if (result.success) {
        setIsAddDialogOpen(false);
        setStationName('');
        router.refresh();
      }
    });
  };

  // Bulk create stations
  const handleBulkCreate = () => {
    if (bulkCount < 1) return;

    startTransition(async () => {
      const result = await bulkCreateCardioStations({
        type: bulkType,
        count: bulkCount,
        prefix: bulkPrefix || undefined,
      });

      if (result.success) {
        setIsBulkDialogOpen(false);
        setBulkPrefix('');
        router.refresh();
      }
    });
  };

  // Delete station
  const handleDeleteStation = (stationId: string) => {
    startTransition(async () => {
      await deleteCardioStation(stationId);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Postes cardio
            </CardTitle>
            <CardDescription>
              Gerez les equipements pour la repartition
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Lot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter plusieurs postes</DialogTitle>
                  <DialogDescription>
                    Creez rapidement plusieurs postes du meme type
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Type d&apos;equipement</Label>
                    <Select value={bulkType} onValueChange={setBulkType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CARDIO_STATION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {STATION_ICONS[type.value]}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nombre de postes</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={bulkCount}
                      onChange={e => setBulkCount(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Prefixe (optionnel)</Label>
                    <Input
                      placeholder="Ex: Rower, Bike..."
                      value={bulkPrefix}
                      onChange={e => setBulkPrefix(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Les postes seront nommes &quot;{bulkPrefix || CARDIO_STATION_TYPES.find(t => t.value === bulkType)?.label} 1&quot;, &quot;{bulkPrefix || CARDIO_STATION_TYPES.find(t => t.value === bulkType)?.label} 2&quot;, etc.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleBulkCreate} disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Creer {bulkCount} postes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  1
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un poste</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Type d&apos;equipement</Label>
                    <Select value={stationType} onValueChange={setStationType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CARDIO_STATION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {STATION_ICONS[type.value]}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nom du poste</Label>
                    <Input
                      placeholder="Ex: Rower 1, Assault Bike A..."
                      value={stationName}
                      onChange={e => setStationName(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateStation} disabled={isPending || !stationName.trim()}>
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Ajouter
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {stations.length === 0 ? (
          <div className="py-8 text-center">
            <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Aucun poste configure
            </p>
            <p className="text-xs text-muted-foreground">
              Ajoutez des rowers, bikes, etc.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(stationsByType).map(([type, typeStations]) => {
              const typeInfo = CARDIO_STATION_TYPES.find(t => t.value === type);
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    {STATION_ICONS[type]}
                    <span className="text-sm font-medium">
                      {typeInfo?.label || type}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {typeStations.length}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {typeStations.map(station => (
                      <Badge
                        key={station.id}
                        variant={station.is_active ? 'outline' : 'secondary'}
                        className="pl-2 pr-1 py-1 gap-1 group"
                      >
                        <span className="text-xs">{station.name}</span>
                        <button
                          onClick={() => handleDeleteStation(station.id)}
                          className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                          disabled={isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
