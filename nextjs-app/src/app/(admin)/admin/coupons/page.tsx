'use client';

import { useState, useEffect } from 'react';
import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '@/actions/billing';
import { getPlatformPlans } from '@/actions/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Percent,
  Euro,
  Calendar,
  Users,
  Trash2,
  Edit,
  Copy,
  Loader2,
  Tag,
} from 'lucide-react';
import type {
  PlatformCoupon,
  CreateCouponInput,
  CouponDiscountType,
  CouponDuration,
} from '@/types/billing.types';
import type { PlatformPlan } from '@/types/platform.types';
import {
  formatCouponDiscount,
  getCouponDurationLabel,
  isCouponValid,
} from '@/types/billing.types';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<PlatformCoupon[]>([]);
  const [, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateCouponInput>({
    code: '',
    name: '',
    description: '',
    discount_type: 'percent',
    discount_percent: 10,
    duration: 'once',
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [couponsResult, plansResult] = await Promise.all([
      getAllCoupons({ includeInactive: showInactive, limit: 100 }),
      getPlatformPlans(),
    ]);

    if (couponsResult.success && couponsResult.data) {
      setCoupons(couponsResult.data.coupons);
    } else if (!couponsResult.success) {
      setError(couponsResult.error || 'Erreur lors du chargement');
    }

    setPlans(plansResult || []);
    setLoading(false);
  }

  async function handleCreate() {
    setError(null);
    setSaving(true);

    // Validate
    if (!formData.code.trim()) {
      setError('Le code est requis');
      setSaving(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Le nom est requis');
      setSaving(false);
      return;
    }

    const result = await createCoupon(formData);

    if (result.success) {
      setDialogOpen(false);
      setFormData({
        code: '',
        name: '',
        description: '',
        discount_type: 'percent',
        discount_percent: 10,
        duration: 'once',
      });
      loadData();
    } else {
      setError(result.error || 'Erreur lors de la creation');
    }

    setSaving(false);
  }

  async function handleToggleActive(coupon: PlatformCoupon) {
    const result = await updateCoupon(coupon.id, {
      is_active: !coupon.is_active,
    });

    if (result.success) {
      loadData();
    }
  }

  async function handleDelete(couponId: string) {
    if (!confirm('Supprimer ce coupon ?')) return;

    const result = await deleteCoupon(couponId);
    if (result.success) {
      loadData();
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
  }

  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.is_active).length,
    used: coupons.reduce((acc, c) => acc + c.redemption_count, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Codes promo</h1>
          <p className="text-gray-500">
            Gerez les codes promotionnels de la plateforme
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Creer un code promo</DialogTitle>
              <DialogDescription>
                Ce code sera synchronise avec Stripe automatiquement
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="LAUNCH50"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="50% lancement"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Offre speciale de lancement"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de reduction</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(v: CouponDiscountType) =>
                      setFormData({ ...formData, discount_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Pourcentage</SelectItem>
                      <SelectItem value="fixed_amount">Montant fixe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {formData.discount_type === 'percent'
                      ? 'Pourcentage (%)'
                      : 'Montant (EUR)'}
                  </Label>
                  <Input
                    type="number"
                    value={
                      formData.discount_type === 'percent'
                        ? formData.discount_percent || ''
                        : (formData.discount_amount_cents || 0) / 100
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (formData.discount_type === 'percent') {
                        setFormData({
                          ...formData,
                          discount_percent: Math.min(100, Math.max(0, val)),
                        });
                      } else {
                        setFormData({
                          ...formData,
                          discount_amount_cents: Math.round(val * 100),
                        });
                      }
                    }}
                    min={0}
                    max={formData.discount_type === 'percent' ? 100 : undefined}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duree</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(v: CouponDuration) =>
                      setFormData({ ...formData, duration: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Premier paiement</SelectItem>
                      <SelectItem value="repeating">Plusieurs mois</SelectItem>
                      <SelectItem value="forever">Toujours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.duration === 'repeating' && (
                  <div className="space-y-2">
                    <Label>Nombre de mois</Label>
                    <Input
                      type="number"
                      value={formData.duration_in_months || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_in_months: parseInt(e.target.value) || undefined,
                        })
                      }
                      min={1}
                      placeholder="3"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Utilisations max</Label>
                  <Input
                    type="number"
                    value={formData.max_redemptions || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_redemptions: parseInt(e.target.value) || undefined,
                      })
                    }
                    min={1}
                    placeholder="Illimite"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date d&apos;expiration</Label>
                  <Input
                    type="date"
                    value={
                      formData.valid_until
                        ? formData.valid_until.split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        valid_until: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="first_time"
                  checked={formData.first_time_only || false}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, first_time_only: c })
                  }
                />
                <Label htmlFor="first_time">
                  Reserve aux nouveaux abonnes uniquement
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Creer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Tag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total coupons</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Percent className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-gray-500">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.used}</p>
                <p className="text-sm text-gray-500">Utilisations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Switch
          id="showInactive"
          checked={showInactive}
          onCheckedChange={setShowInactive}
        />
        <Label htmlFor="showInactive">Afficher les inactifs</Label>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucun code promo
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Reduction</TableHead>
                  <TableHead>Duree</TableHead>
                  <TableHead>Utilisations</TableHead>
                  <TableHead>Validite</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{coupon.name}</p>
                        {coupon.description && (
                          <p className="text-sm text-gray-500">
                            {coupon.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {coupon.discount_type === 'percent' ? (
                          <Percent className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Euro className="h-4 w-4 text-gray-400" />
                        )}
                        {formatCouponDiscount(coupon)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCouponDurationLabel(
                        coupon.duration,
                        coupon.duration_in_months
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {coupon.redemption_count}
                        {coupon.max_redemptions
                          ? ` / ${coupon.max_redemptions}`
                          : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.valid_until ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(coupon.valid_until).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Sans limite
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isCouponValid(coupon) ? (
                        <Badge variant="default" className="bg-green-500">
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(coupon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(coupon.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
