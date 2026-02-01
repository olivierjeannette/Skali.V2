'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { importMembersFromCSV, getCSVTemplate } from '@/actions/import';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ImportMembersPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    total: number;
    imported: number;
    errors: string[];
  } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Veuillez selectionner un fichier CSV');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      setError('Le fichier doit etre au format CSV');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const csvData = await file.text();
      const response = await importMembersFromCSV(csvData);

      if (!response.success) {
        setError(response.error);
        return;
      }

      setResult(response.data!);

      if (response.data!.imported > 0) {
        // Refresh after a short delay
        setTimeout(() => {
          router.push('/dashboard/members');
          router.refresh();
        }, 3000);
      }
    } catch {
      setError('Une erreur est survenue lors de l\'import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const template = await getCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_membres.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/members">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import CSV</h1>
          <p className="text-muted-foreground">
            Importez vos membres depuis un fichier CSV
          </p>
        </div>
      </div>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.imported > 0 ? (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                    ✓
                  </div>
                  Import termine
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
                    !
                  </div>
                  Import echoue
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-2xl font-bold">{result.total}</div>
                <div className="text-sm text-muted-foreground">Lignes lues</div>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                <div className="text-sm text-muted-foreground">Importes</div>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                <div className="text-sm text-muted-foreground">Erreurs</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <h4 className="mb-2 font-semibold text-red-800">Erreurs:</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li>... et {result.errors.length - 10} autres erreurs</li>
                  )}
                </ul>
              </div>
            )}

            {result.imported > 0 && (
              <p className="text-sm text-muted-foreground">
                Redirection vers la liste des membres dans quelques secondes...
              </p>
            )}

            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard/members">Retour a la liste</Link>
              </Button>
              {result.imported === 0 && (
                <Button onClick={() => setResult(null)}>Reessayer</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
              <CardDescription>
                Format du fichier CSV attendu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold">Colonnes acceptees:</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li><strong>prenom</strong> ou <strong>first_name</strong> (requis)</li>
                  <li><strong>nom</strong> ou <strong>last_name</strong> (requis)</li>
                  <li><strong>email</strong></li>
                  <li><strong>telephone</strong> ou <strong>phone</strong></li>
                  <li><strong>date_naissance</strong> ou <strong>birth_date</strong> (format: YYYY-MM-DD ou DD/MM/YYYY)</li>
                  <li><strong>genre</strong> ou <strong>gender</strong> (homme/femme/autre)</li>
                  <li><strong>numero</strong> ou <strong>member_number</strong></li>
                </ul>
              </div>

              <Button variant="outline" onClick={handleDownloadTemplate}>
                Telecharger le template CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selectionner le fichier</CardTitle>
              <CardDescription>
                Choisissez votre fichier CSV a importer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-file"
                />
                <label
                  htmlFor="csv-file"
                  className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
                >
                  <svg
                    className="mb-2 h-8 w-8 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  {fileName ? (
                    <span className="text-sm font-medium">{fileName}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Cliquez pour selectionner un fichier CSV
                    </span>
                  )}
                </label>
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/members">Annuler</Link>
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!fileName || isLoading}
                >
                  {isLoading ? 'Import en cours...' : 'Importer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
