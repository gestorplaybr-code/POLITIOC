import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type UF = { id: number; sigla: string; nome: string };
type City = { id: number; nome: string };

async function fetchUFs(): Promise<UF[]> {
  const r = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
  if (!r.ok) throw new Error("Falha ao carregar estados");
  return r.json();
}

async function fetchCities(uf: string): Promise<City[]> {
  const r = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
  );
  if (!r.ok) throw new Error("Falha ao carregar cidades");
  return r.json();
}

export function BRLocationPicker({
  uf,
  cidade,
  onChange,
  required,
  ufLabel = "UF",
  cidadeLabel = "Cidade",
  showGeolocate = true,
}: {
  uf: string;
  cidade: string;
  onChange: (next: { uf: string; cidade: string }) => void;
  required?: boolean;
  ufLabel?: string;
  cidadeLabel?: string;
  showGeolocate?: boolean;
}) {
  const ufsQ = useQuery({ queryKey: ["ibge-ufs"], queryFn: fetchUFs, staleTime: 1000 * 60 * 60 });
  const citiesQ = useQuery({
    queryKey: ["ibge-cities", uf],
    queryFn: () => fetchCities(uf),
    enabled: !!uf,
    staleTime: 1000 * 60 * 30,
  });

  const [ufOpen, setUfOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const ufList = useMemo(
    () => (ufsQ.data ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome)),
    [ufsQ.data],
  );
  const cityList = useMemo(
    () => (citiesQ.data ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome)),
    [citiesQ.data],
  );

  async function geolocate() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalização não disponível neste dispositivo");
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
        });
      });
      const { latitude, longitude } = pos.coords;
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`,
        { headers: { Accept: "application/json" } },
      );
      if (!r.ok) throw new Error("Falha na geocodificação");
      const data = await r.json();
      const addr = data?.address ?? {};
      const foundCity: string =
        addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
      const foundUFCode: string = (addr["ISO3166-2-lvl4"] || "").replace(/^BR-/, "");
      if (!foundUFCode || !foundCity) {
        toast.error("Não foi possível identificar cidade/UF a partir da localização");
        return;
      }
      // Match against IBGE list to ensure canonical name
      const cities = await fetchCities(foundUFCode);
      const norm = (s: string) =>
        s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      const match = cities.find((c) => norm(c.nome) === norm(foundCity));
      onChange({ uf: foundUFCode, cidade: match?.nome ?? foundCity });
      toast.success(`Localização: ${match?.nome ?? foundCity} - ${foundUFCode}`);
    } catch (err: any) {
      const msg =
        err?.code === 1
          ? "Permissão de localização negada"
          : err?.code === 3
            ? "Tempo de localização esgotado"
            : err?.message || "Não foi possível obter a localização";
      toast.error(msg);
    } finally {
      setLocating(false);
    }
  }

  // Reset cidade if UF muda e cidade não pertence à nova UF
  useEffect(() => {
    if (!uf) return;
    if (!cidade) return;
    if (citiesQ.isLoading || !citiesQ.data) return;
    const exists = citiesQ.data.some((c) => c.nome === cidade);
    if (!exists) onChange({ uf, cidade: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uf, citiesQ.data]);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label>
          {ufLabel} {required && <span className="text-rose-400">*</span>}
        </Label>
        <Popover open={ufOpen} onOpenChange={setUfOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal"
              disabled={ufsQ.isLoading}
            >
              {uf ? uf : ufsQ.isLoading ? "Carregando..." : "Selecione"}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar estado..." />
              <CommandList>
                <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                <CommandGroup>
                  {ufList.map((u) => (
                    <CommandItem
                      key={u.id}
                      value={`${u.nome} ${u.sigla}`}
                      onSelect={() => {
                        onChange({ uf: u.sigla, cidade: uf === u.sigla ? cidade : "" });
                        setUfOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          uf === u.sigla ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="mr-2 font-mono text-xs opacity-70">{u.sigla}</span>
                      {u.nome}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="col-span-2 space-y-1.5">
        <Label className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          {cidadeLabel} {required && <span className="text-rose-400">*</span>}
        </Label>
        <div className="flex gap-2">
          <Popover open={cityOpen} onOpenChange={setCityOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full flex-1 justify-between font-normal"
                disabled={!uf || citiesQ.isLoading}
              >
                {cidade
                  ? cidade
                  : !uf
                    ? "Escolha a UF primeiro"
                    : citiesQ.isLoading
                      ? "Carregando cidades..."
                      : "Selecione a cidade"}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar cidade..." />
                <CommandList>
                  <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                  <CommandGroup>
                    {cityList.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.nome}
                        onSelect={() => {
                          onChange({ uf, cidade: c.nome });
                          setCityOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            cidade === c.nome ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {c.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {showGeolocate && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={geolocate}
              disabled={locating}
              title="Usar minha localização"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}