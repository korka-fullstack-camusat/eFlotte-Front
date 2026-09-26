import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, ChevronLeft, ChevronRight, Send, Camera, CheckCheck, AlertTriangle, Loader2, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { inspectionService } from "@/services/inspections";
import { compresserImage } from "@/lib/image";
import type { ChecklistModele, MonEspace, RapportDetail, ReponseItem, VehiculeMini } from "@/types";
import SignaturePad from "./SignaturePad";
import { useModele } from "./useModele";

type Photo = { blob: Blob; url: string };

interface Brouillon {
  etape: number;
  type_rapport: string;
  immatriculation: string;
  kilometrage: string;
  visite_technique: string;
  filiale: string;
  items: Record<string, ReponseItem>;
  autres: Record<string, string>;
  commentaires: string;
  nom_instructeur: string;
}

// Les réponses sont gardées sur le téléphone si l'app est fermée en cours de saisie
// (pas les photos ni la signature, trop lourdes pour le stockage local).
const cleBrouillon = (username: string) => `eflotte_checklist_brouillon_${username}`;

function lireBrouillon(username: string): Brouillon | null {
  try {
    const brut = localStorage.getItem(cleBrouillon(username));
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

function ecrireBrouillon(username: string, b: Brouillon | null) {
  try {
    if (b) localStorage.setItem(cleBrouillon(username), JSON.stringify(b));
    else localStorage.removeItem(cleBrouillon(username));
  } catch {
    /* stockage indisponible (navigation privée) : on continue sans brouillon */
  }
}

function Choix({
  options, valeur, negative, onChange, label,
}: {
  options: { valeur: string; libelle: string }[];
  valeur: string | undefined;
  negative: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
      {options.map(o => {
        const actif = valeur === o.valeur;
        const neg = o.valeur === negative;
        return (
          <button
            key={o.valeur}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => onChange(o.valeur)}
            className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold border-2 transition active:scale-[0.98] ${
              actif
                ? neg ? "bg-red-600 border-red-600 text-white" : "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}

export default function NouveauRapportModal({
  espace, onClose, onEnvoye,
}: {
  espace: MonEspace;
  onClose: () => void;
  onEnvoye: (r: RapportDetail) => void;
}) {
  const { modele, erreur: erreurModele } = useModele();
  const brouillon = useMemo(() => lireBrouillon(espace.username), [espace.username]);

  const [etape, setEtape] = useState(brouillon?.etape ?? 0);
  const [typeRapport, setTypeRapport] = useState(brouillon?.type_rapport ?? "INSPECTION");
  const [immatriculation, setImmatriculation] = useState(brouillon?.immatriculation ?? espace.vehicule_plaque ?? "");
  const [kilometrage, setKilometrage] = useState(brouillon?.kilometrage ?? "");
  const [visiteTechnique, setVisiteTechnique] = useState(brouillon?.visite_technique ?? "");
  const [filiale, setFiliale] = useState(brouillon?.filiale ?? espace.filiale_precedente ?? "");
  const [items, setItems] = useState<Record<string, ReponseItem>>(brouillon?.items ?? {});
  const [autres, setAutres] = useState<Record<string, string>>(brouillon?.autres ?? {});
  const [commentaires, setCommentaires] = useState(brouillon?.commentaires ?? "");
  const [nomInstructeur, setNomInstructeur] = useState(brouillon?.nom_instructeur ?? "");
  const [photos, setPhotos] = useState<Record<string, Photo>>({});
  const [photoEnCours, setPhotoEnCours] = useState<string | null>(null);
  const [signature, setSignature] = useState("");
  const [vehicules, setVehicules] = useState<VehiculeMini[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [tentative, setTentative] = useState(false);   // affiche les champs manquants après un clic sur « Suivant »
  const inputPhoto = useRef<HTMLInputElement>(null);
  const cible = useRef<string | null>(null);
  const corps = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inspectionService.vehicules().then(setVehicules).catch(() => setVehicules([]));
  }, []);

  // Libère les aperçus de photos à la fermeture
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => Object.values(photosRef.current).forEach(p => URL.revokeObjectURL(p.url)), []);

  useEffect(() => {
    ecrireBrouillon(espace.username, {
      etape, type_rapport: typeRapport, immatriculation, kilometrage, visite_technique: visiteTechnique,
      filiale, items, autres, commentaires, nom_instructeur: nomInstructeur,
    });
  }, [espace.username, etape, typeRapport, immatriculation, kilometrage, visiteTechnique, filiale, items, autres, commentaires, nomInstructeur]);

  // Étapes : infos, une par section du formulaire, photos, validation
  const etapes = useMemo(() => modele ? [
    { cle: "infos", titre: "Véhicule" },
    ...modele.sections.map(s => ({ cle: s.cle, titre: s.titre })),
    { cle: "photos", titre: "Photos" },
    { cle: "validation", titre: "Signature et envoi" },
  ] : [], [modele]);

  // Brouillon d'une ancienne version du formulaire : repartir du début
  useEffect(() => { if (etapes.length && etape >= etapes.length) setEtape(0); }, [etapes.length, etape]);

  const section = modele?.sections.find(s => s.cle === etapes[etape]?.cle);
  const derniere = etape === etapes.length - 1;

  const manquants = (m: ChecklistModele, idx: number): string[] => {
    const cle = etapes[idx]?.cle;
    if (cle === "infos") {
      const out: string[] = [];
      if (!immatriculation) out.push("véhicule");
      if (kilometrage === "" || !/^\d+$/.test(kilometrage)) out.push("kilométrage");
      return out;
    }
    if (cle === "photos") return m.photos.filter(p => !photos[p.position]).map(p => p.libelle);
    if (cle === "validation") return signature ? [] : ["signature"];
    const s = m.sections.find(x => x.cle === cle);
    return s ? s.items.filter(i => !items[i.cle]?.valeur).map(i => i.libelle) : [];
  };

  const aller = (idx: number) => {
    setEtape(idx);
    setTentative(false);
    corps.current?.scrollTo({ top: 0 });
  };

  const suivant = () => {
    if (!modele) return;
    if (manquants(modele, etape).length) { setTentative(true); return; }
    aller(etape + 1);
  };

  const repondre = (cle: string, valeur: string) =>
    setItems(prev => ({ ...prev, [cle]: { valeur, commentaire: prev[cle]?.commentaire ?? "" } }));

  const commenter = (cle: string, commentaire: string) =>
    setItems(prev => ({ ...prev, [cle]: { ...prev[cle], commentaire } }));

  const toutConforme = () => {
    if (!modele || !section) return;
    const positive = modele.types_reponse[section.type].options.find(o => o.valeur !== modele.types_reponse[section.type].negative)!.valeur;
    setItems(prev => {
      const next = { ...prev };
      section.items.forEach(i => { if (!next[i.cle]?.valeur) next[i.cle] = { valeur: positive, commentaire: "" }; });
      return next;
    });
  };

  const prendrePhoto = (position: string) => {
    cible.current = position;
    inputPhoto.current?.click();
  };

  const surPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const position = cible.current;
    e.target.value = "";
    if (!file || !position) return;
    setPhotoEnCours(position);
    try {
      const blob = await compresserImage(file);
      setPhotos(prev => {
        if (prev[position]) URL.revokeObjectURL(prev[position].url);
        return { ...prev, [position]: { blob, url: URL.createObjectURL(blob) } };
      });
    } catch {
      toast.error("Impossible de lire cette photo, réessayez.");
    } finally {
      setPhotoEnCours(null);
    }
  };

  const fermer = () => {
    const commence = Object.keys(items).length > 0 || Object.keys(photos).length > 0 || kilometrage !== "";
    if (commence && !confirm("Fermer le formulaire ? Vos réponses restent enregistrées sur ce téléphone, mais les photos et la signature seront à refaire.")) return;
    onClose();
  };

  const envoyer = async () => {
    if (!modele) return;
    const incomplete = etapes.findIndex((_, i) => manquants(modele, i).length > 0);
    if (incomplete !== -1) { aller(incomplete); setTentative(true); return; }
    setEnvoi(true);
    try {
      const rapport = await inspectionService.envoyer(
        {
          type_rapport: typeRapport,
          immatriculation,
          kilometrage: Number(kilometrage),
          filiale,
          visite_technique: visiteTechnique || null,
          reponses: { items, autres },
          commentaires,
          nom_instructeur: typeRapport === "RESTITUTION" ? nomInstructeur : "",
          signature,
        },
        Object.fromEntries(Object.entries(photos).map(([k, p]) => [k, p.blob])),
      );
      ecrireBrouillon(espace.username, null);
      toast.success("Checklist envoyée");
      onEnvoye(rapport);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail
          : err?.response ? "Envoi refusé : vérifiez que toutes les étapes sont complètes."
          : "Pas de connexion. Vos réponses sont conservées, réessayez dès que le réseau revient.",
        { duration: 6000 },
      );
    } finally {
      setEnvoi(false);
    }
  };

  const listeManquants = modele && tentative ? manquants(modele, etape) : [];
  const nonConformes = modele ? modele.sections.flatMap(s =>
    s.items.filter(i => items[i.cle]?.valeur === modele.types_reponse[s.type].negative).map(i => i)
  ) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/40 sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="nouveau-rapport-titre"
        className="bg-camugray-100 w-full sm:max-w-lg h-full sm:h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* En-tête + progression */}
        <div className="bg-camublue-900 text-white px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-white/70">
                {etapes.length ? `Étape ${etape + 1} sur ${etapes.length}` : "Nouveau rapport"}
              </p>
              <h2 id="nouveau-rapport-titre" className="font-bold truncate">{etapes[etape]?.titre ?? "Chargement…"}</h2>
            </div>
            <button onClick={fermer} aria-label="Fermer le formulaire" className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0">
              <X size={18} />
            </button>
          </div>
          {etapes.length > 0 && (
            <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden" role="progressbar"
              aria-valuemin={1} aria-valuemax={etapes.length} aria-valuenow={etape + 1} aria-label="Progression">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${((etape + 1) / etapes.length) * 100}%` }} />
            </div>
          )}
        </div>

        {/* Corps */}
        <div ref={corps} className="flex-1 overflow-y-auto px-4 py-4">
          {erreurModele ? (
            <p className="text-center text-sm text-red-600 py-10">Impossible de charger le formulaire. Vérifiez votre connexion.</p>
          ) : !modele ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-camublue-900" aria-label="Chargement" /></div>
          ) : etapes[etape].cle === "infos" ? (
            <div className="space-y-4">
              <fieldset>
                <legend className="block text-xs font-semibold text-gray-600 mb-1.5">Type de rapport</legend>
                <div className="grid grid-cols-2 gap-2">
                  {modele.types_rapport.map(t => (
                    <button key={t.valeur} type="button" aria-pressed={typeRapport === t.valeur}
                      onClick={() => setTypeRapport(t.valeur)}
                      className={`min-h-[44px] rounded-xl text-sm font-semibold border-2 transition ${
                        typeRapport === t.valeur ? "bg-camublue-900 border-camublue-900 text-white" : "bg-white border-gray-200 text-gray-700"
                      }`}>
                      {t.libelle}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="rap-vehicule" className="block text-xs font-semibold text-gray-600 mb-1.5">Véhicule *</label>
                <select id="rap-vehicule" value={immatriculation} onChange={e => setImmatriculation(e.target.value)}
                  className="input-base min-h-[44px] bg-white" disabled={!vehicules}>
                  <option value="">{vehicules ? "Choisir le véhicule" : "Chargement…"}</option>
                  {immatriculation && vehicules && !vehicules.some(v => v.plaque_immatriculation === immatriculation) && (
                    <option value={immatriculation}>{immatriculation}</option>
                  )}
                  {vehicules?.map(v => (
                    <option key={v.plaque_immatriculation} value={v.plaque_immatriculation}>
                      {v.plaque_immatriculation}{v.marque || v.modele ? ` — ${[v.marque, v.modele].filter(Boolean).join(" ")}` : ""}
                    </option>
                  ))}
                </select>
                {espace.vehicule_plaque && immatriculation && immatriculation !== espace.vehicule_plaque && (
                  <p className="mt-1 text-xs text-amber-700">Ce n'est pas le véhicule qui vous est attribué ({espace.vehicule_plaque}).</p>
                )}
              </div>

              <div>
                <label htmlFor="rap-km" className="block text-xs font-semibold text-gray-600 mb-1.5">Kilométrage actuel (km) *</label>
                <input id="rap-km" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off"
                  value={kilometrage} onChange={e => setKilometrage(e.target.value.replace(/\D/g, ""))}
                  placeholder="ex : 45230" className="input-base min-h-[44px] bg-white" />
              </div>

              <div>
                <label htmlFor="rap-vt" className="block text-xs font-semibold text-gray-600 mb-1.5">Date de la visite technique</label>
                <input id="rap-vt" type="date" value={visiteTechnique} onChange={e => setVisiteTechnique(e.target.value)}
                  className="input-base min-h-[44px] bg-white" />
              </div>

              <div>
                <label htmlFor="rap-filiale" className="block text-xs font-semibold text-gray-600 mb-1.5">Filiale</label>
                <input id="rap-filiale" type="text" value={filiale} onChange={e => setFiliale(e.target.value)}
                  placeholder="ex : Camusat Sénégal" className="input-base min-h-[44px] bg-white" />
              </div>
            </div>
          ) : section ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">{section.question}</p>
                <button type="button" onClick={toutConforme}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">
                  <CheckCheck size={14} /> Tout conforme
                </button>
              </div>
              {section.items.map(i => {
                const rep = items[i.cle];
                const neg = rep?.valeur === modele.types_reponse[section.type].negative;
                const manque = tentative && !rep?.valeur;
                return (
                  <div key={i.cle} className={`rounded-2xl bg-white p-3 shadow-sm ring-1 ${manque ? "ring-red-400" : "ring-gray-100"}`}>
                    <p className="text-sm font-semibold text-gray-800 mb-2 flex items-start gap-2">
                      <span className="flex-1">{i.libelle}</span>
                      {i.critique && (
                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600 ring-1 ring-red-200">Critique</span>
                      )}
                    </p>
                    <Choix options={modele.types_reponse[section.type].options} valeur={rep?.valeur}
                      negative={modele.types_reponse[section.type].negative}
                      onChange={v => repondre(i.cle, v)} label={i.libelle} />
                    {neg && (
                      <textarea value={rep?.commentaire ?? ""} onChange={e => commenter(i.cle, e.target.value)} rows={2}
                        aria-label={`Commentaire : ${i.libelle}`}
                        placeholder={section.type === "ETAT" ? "Pourquoi ? Où se trouve le problème ?" : "Précisez (facultatif)"}
                        className="input-base mt-2 text-sm bg-white" />
                    )}
                  </div>
                );
              })}
              <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
                <label htmlFor={`autres-${section.cle}`} className="block text-sm font-semibold text-gray-800 mb-2">Autres (facultatif)</label>
                <input id={`autres-${section.cle}`} type="text" value={autres[section.cle] ?? ""}
                  onChange={e => setAutres(prev => ({ ...prev, [section.cle]: e.target.value }))}
                  placeholder="Autre élément à signaler" className="input-base text-sm bg-white" />
              </div>
            </div>
          ) : etapes[etape].cle === "photos" ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">Prenez les 6 photos du véhicule. Touchez une case pour ouvrir l'appareil photo.</p>
              <input ref={inputPhoto} type="file" accept="image/*" capture="environment" className="hidden" onChange={surPhoto} tabIndex={-1} aria-hidden />
              <div className="grid grid-cols-2 gap-3">
                {modele.photos.map(p => {
                  const photo = photos[p.position];
                  const manque = tentative && !photo;
                  return (
                    <button key={p.position} type="button" onClick={() => prendrePhoto(p.position)}
                      aria-label={photo ? `Reprendre la photo : ${p.libelle}` : `Prendre la photo : ${p.libelle}`}
                      className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 flex flex-col items-center justify-center gap-1 text-xs font-semibold transition active:scale-[0.98] ${
                        photo ? "border-emerald-500" : manque ? "border-red-400 bg-red-50 text-red-600" : "border-dashed border-gray-300 bg-white text-gray-500"
                      }`}>
                      {photoEnCours === p.position ? (
                        <Loader2 className="animate-spin text-camublue-900" />
                      ) : photo ? (
                        <>
                          <img src={photo.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white py-1 flex items-center justify-center gap-1">
                            <RotateCcw size={12} /> {p.libelle}
                          </span>
                        </>
                      ) : (
                        <><Camera size={22} /> {p.libelle}</>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-2xl p-3 ring-1 ${nonConformes.some(i => i.critique) ? "bg-red-50 ring-red-200" : nonConformes.length ? "bg-amber-50 ring-amber-200" : "bg-emerald-50 ring-emerald-200"}`}>
                <p className="text-sm font-semibold text-gray-800">
                  {nonConformes.length === 0 ? "Tous les points sont conformes." : `${nonConformes.length} point${nonConformes.length > 1 ? "s" : ""} non conforme${nonConformes.length > 1 ? "s" : ""}`}
                </p>
                {nonConformes.length > 0 && (
                  <ul className="mt-1 text-sm text-gray-700 space-y-0.5">
                    {nonConformes.map(i => (
                      <li key={i.cle} className="flex items-center gap-1.5">
                        {i.critique && <AlertTriangle size={13} className="text-red-600 shrink-0" aria-label="critique" />}
                        {i.libelle}
                      </li>
                    ))}
                  </ul>
                )}
                {nonConformes.some(i => i.critique) && (
                  <p className="mt-2 text-xs font-medium text-red-700">
                    Un point critique n'est pas conforme : le véhicule doit être immobilisé. Prévenez votre responsable.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="rap-com" className="block text-xs font-semibold text-gray-600 mb-1.5">Commentaires</label>
                <textarea id="rap-com" rows={3} value={commentaires} onChange={e => setCommentaires(e.target.value)}
                  className="input-base bg-white" placeholder="Remarques générales (facultatif)" />
              </div>

              {typeRapport === "RESTITUTION" && (
                <div>
                  <label htmlFor="rap-instr" className="block text-xs font-semibold text-gray-600 mb-1.5">Nom et prénom de l'instructeur</label>
                  <input id="rap-instr" type="text" value={nomInstructeur} onChange={e => setNomInstructeur(e.target.value)}
                    className="input-base min-h-[44px] bg-white" />
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">
                  Signature du conducteur * <span className="font-normal text-gray-400">({espace.full_name || espace.username})</span>
                </p>
                <SignaturePad value={signature} onChange={setSignature} />
              </div>
            </div>
          )}

          {listeManquants.length > 0 && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              À compléter : {listeManquants.join(", ")}.
            </p>
          )}
        </div>

        {/* Navigation */}
        {modele && (
          <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] flex gap-2">
            <button type="button" onClick={() => aller(etape - 1)} disabled={etape === 0 || envoi}
              className="min-h-[48px] px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-40 inline-flex items-center gap-1">
              <ChevronLeft size={16} /> Retour
            </button>
            {derniere ? (
              <button type="button" onClick={envoyer} disabled={envoi}
                className="flex-1 min-h-[48px] rounded-xl bg-camublue-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {envoi ? <><Loader2 size={16} className="animate-spin" /> Envoi…</> : <><Send size={16} /> Envoyer la checklist</>}
              </button>
            ) : (
              <button type="button" onClick={suivant}
                className="flex-1 min-h-[48px] rounded-xl bg-camublue-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-1">
                Suivant <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
