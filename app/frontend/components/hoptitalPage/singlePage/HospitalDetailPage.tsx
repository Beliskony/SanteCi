"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Phone, Mail, Globe, Clock, Shield, Users, Star,
  CheckCircle, XCircle, ArrowLeft, Stethoscope, Building2,
  Ambulance, FlaskConical, Camera, Bed, Home, Video,
  HeartPulse, ChevronRight, Calendar,
} from "lucide-react";

// ─── Types (alignés sur le schéma Mongoose) ───────────────────────────────────

interface ServiceItem {
  name: string;
  specialty?: string;
  available: boolean;
  hours?: { open: string; close: string };
}

interface DoctorStub {
  _id: string;
  profile: {
    firstName: string;
    lastName: string;
    title: string;
    specialty: string;
    photo?: string;
  };
}

interface Hospital {
  _id: string;
  facilityId: string;
  name: string;
  type: "hospital" | "clinic" | "pharmacy" | "laboratory" | "imaging_center";
  category: string;
  imageCover?: { url: string; publicId: string };
  location: {
    address: string;
    city: string;
    district: string;
    commune?: string;
    coordinates?: { latitude: number; longitude: number }; //  Rendre optionnel
  };
  contact: {
    phoneNumbers: string[];
    email: string;
    website?: string;
    emergencyNumber?: string;
  };
  services: ServiceItem[];
  staff: {
    doctors: DoctorStub[];
    nurses: number;
    administrators: number;
  };
  facilities: {
    consultationRooms: number;
    emergencyRoom: boolean;
    pharmacy: boolean;
    laboratory: boolean;
    imaging: boolean;
    beds: number;
  };
  partnerships: {
    insuranceCompanies: string[];
    telemedicineEnabled: boolean;
    homeVisits: boolean;
  };
  hours: {
    weekdays: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday:   { open: string; close: string };
    emergency24h: boolean;
  };
  certification: {
    licenseNumber: string;
    accreditation: string[];
    expiryDate: string;
  };
  metadata: {
    verified: boolean;
    rating: number;
    totalReviews: number;
  };
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  hospital:       "Hôpital",
  clinic:         "Clinique privée",
  pharmacy:       "Pharmacie",
  laboratory:     "Laboratoire",
  imaging_center: "Centre d'imagerie",
};

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "green" | "gray" }) {
  const cls = {
    blue:  "bg-[#1e3a8a]/10 text-[#1e3a8a]",
    green: "bg-emerald-50 text-emerald-700",
    gray:  "bg-slate-100 text-slate-600",
  }[color];
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{children}</span>;
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className="w-9 h-9 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a] shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-800 font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function FacilityChip({ available, label, icon }: { available: boolean; label: string; icon: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${
      available
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-400"
    }`}>
      {available
        ? <CheckCircle size={14} className="shrink-0" />
        : <XCircle size={14} className="shrink-0" />}
      <span className="flex items-center gap-1.5">{icon}{label}</span>
    </div>
  );
}

function HoursRow({ day, hours }: { day: string; hours: { open: string; close: string } }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{day}</span>
      <span className="text-sm font-semibold text-slate-800">{hours.open} – {hours.close}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
        />
      ))}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function HospitalDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = params?.id as string;

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/hopitaux/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Établissement introuvable.");
        return r.json();
      })
      .then((data) => setHospital(data.data ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-2 border-[#1e3a8a]/30 border-t-[#1e3a8a] rounded-full animate-spin" />
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // ── Erreur ───────────────────────────────────────────────────────────────────
  if (error || !hospital) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Building2 size={48} className="text-slate-300" />
        <p className="text-slate-500 text-sm">{error ?? "Établissement introuvable."}</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[#1e3a8a] text-sm font-semibold hover:underline">
          <ArrowLeft size={14} /> Retour
        </button>
      </div>
    );
  }

  const { name, type, location, contact, services, staff, facilities,
          partnerships, hours, certification, metadata, imageCover } = hospital;

  const availableServices = services?.filter((s) => s.available) ?? [];

  //  Vérifier si les coordonnées existent
  const hasCoordinates = location?.coordinates?.latitude && location?.coordinates?.longitude;
  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${location?.coordinates?.latitude},${location?.coordinates?.longitude}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero ── */}
      <div className="relative h-72 md:h-96 w-full overflow-hidden bg-[#1e3a8a]">
        {imageCover?.url ? (
          <img src={imageCover.url} alt={name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-[#1e3a8a] to-blue-400" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-5 left-5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={14} /> Retour
          </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge color="gray">{TYPE_LABELS[type] ?? type}</Badge>
            {metadata?.verified && (
              <Badge color="green">
                <CheckCircle size={11} /> Vérifié
              </Badge>
            )}
            {hours?.emergency24h && (
              <Badge color="blue">
                <Ambulance size={11} /> Urgences 24h/7
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{name}</h1>
          <div className="flex items-center gap-1.5 mt-1.5 text-white/80 text-sm">
            <MapPin size={14} className="shrink-0" />
            <span>{location?.district}, {location?.city}</span>
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Note & stats rapides */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap gap-6 items-center">
            <div className="flex flex-col gap-1">
              <StarRating rating={metadata?.rating ?? 0} />
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-800">{(metadata?.rating ?? 0).toFixed(1)}</span>
                {" "}/ 5 · {metadata?.totalReviews ?? 0} avis
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200 shrink-0" />
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Users size={16} className="text-[#1e3a8a]" />
              <span><strong>{staff?.doctors?.length ?? 0}</strong> médecins</span>
            </div>
            <div className="h-8 w-px bg-slate-200 shrink-0" />
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Bed size={16} className="text-[#1e3a8a]" />
              <span><strong>{facilities?.beds ?? 0}</strong> lits</span>
            </div>
            <div className="h-8 w-px bg-slate-200 shrink-0" />
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Stethoscope size={16} className="text-[#1e3a8a]" />
              <span><strong>{facilities?.consultationRooms ?? 0}</strong> salles de consultation</span>
            </div>
          </div>

          {/* Services disponibles */}
          {availableServices.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <HeartPulse size={16} className="text-[#1e3a8a]" /> Services proposés
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableServices.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      {s.specialty && <p className="text-xs text-slate-400">{s.specialty}</p>}
                      {s.hours && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.hours.open} – {s.hours.close}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Équipements */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-[#1e3a8a]" /> Équipements
            </h2>
            <div className="flex flex-wrap gap-2">
              <FacilityChip available={facilities?.emergencyRoom ?? false} label="Salle d'urgence" icon={<Ambulance size={13} />} />
              <FacilityChip available={facilities?.pharmacy ?? false}     label="Pharmacie"        icon={<FlaskConical size={13} />} />
              <FacilityChip available={facilities?.laboratory ?? false}   label="Laboratoire"      icon={<FlaskConical size={13} />} />
              <FacilityChip available={facilities?.imaging ?? false}      label="Imagerie médicale" icon={<Camera size={13} />} />
              <FacilityChip available={partnerships?.telemedicineEnabled ?? false} label="Téléconsultation" icon={<Video size={13} />} />
              <FacilityChip available={partnerships?.homeVisits ?? false} label="Visites à domicile" icon={<Home size={13} />} />
            </div>
          </div>

          {/* Médecins */}
          {staff?.doctors?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users size={16} className="text-[#1e3a8a]" /> Médecins de l'établissement
                <span className="ml-auto text-xs text-slate-400 font-normal">{staff.doctors.length} médecins</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {staff.doctors.slice(0, 6).map((doc) => (
                  <Link
                    key={doc._id}
                    href={`/doctors/${doc._id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-[#1e3a8a]/30 hover:bg-[#1e3a8a]/5 transition-all group"
                  >
                    {doc.profile.photo ? (
                      <img src={doc.profile.photo} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a] font-bold text-sm shrink-0">
                        {doc.profile.firstName?.[0]}{doc.profile.lastName?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {doc.profile.title} {doc.profile.firstName} {doc.profile.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{doc.profile.specialty}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-[#1e3a8a] shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
              {staff.doctors.length > 6 && (
                <p className="text-xs text-slate-400 mt-3 text-center">
                  + {staff.doctors.length - 6} autres médecins
                </p>
              )}
            </div>
          )}

          {/* Assurances partenaires */}
          {partnerships?.insuranceCompanies?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Shield size={16} className="text-[#1e3a8a]" /> Assurances acceptées
              </h2>
              <div className="flex flex-wrap gap-2">
                {partnerships.insuranceCompanies.map((ins, i) => (
                  <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg">
                    {ins}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Colonne latérale ── */}
        <div className="flex flex-col gap-5">

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-900">Contact</h2>
            {contact?.phoneNumbers?.map((p, i) => (
              <a key={i} href={`tel:${p}`} className="flex items-center gap-2.5 text-sm text-[#1e3a8a] font-medium hover:underline">
                <Phone size={14} className="shrink-0" /> {p}
              </a>
            ))}
            {contact?.emergencyNumber && (
              <a href={`tel:${contact.emergencyNumber}`} className="flex items-center gap-2.5 text-sm text-red-500 font-medium hover:underline">
                <Ambulance size={14} className="shrink-0" /> {contact.emergencyNumber} (urgences)
              </a>
            )}
            <a href={`mailto:${contact?.email}`} className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-[#1e3a8a] transition-colors">
              <Mail size={14} className="shrink-0" /> {contact?.email}
            </a>
            {contact?.website && (
              <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-[#1e3a8a] transition-colors">
                <Globe size={14} className="shrink-0" /> Site web
              </a>
            )}
          </div>

          {/* Horaires */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock size={14} className="text-[#1e3a8a]" /> Horaires d'ouverture
            </h2>
            <HoursRow day="Lun – Ven" hours={hours?.weekdays ?? { open: '08:00', close: '18:00' }} />
            <HoursRow day="Samedi"    hours={hours?.saturday ?? { open: '08:00', close: '13:00' }} />
            <HoursRow day="Dimanche"  hours={hours?.sunday ?? { open: '08:00', close: '13:00' }} />
            {hours?.emergency24h && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                <Ambulance size={13} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600 font-semibold">Urgences ouvertes 24h/24, 7j/7</span>
              </div>
            )}
          </div>

          {/* Adresse */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-900">Adresse</h2>
            <div className="flex items-start gap-2.5 text-sm text-slate-600">
              <MapPin size={14} className="text-[#1e3a8a] shrink-0 mt-0.5" />
              <span>{location?.address}, {location?.district}, {location?.city}</span>
            </div>
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <MapPin size={13} /> Voir sur la carte
              </a>
            )}
          </div>

          {/* Certification */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Shield size={14} className="text-[#1e3a8a]" /> Certification
            </h2>
            <InfoCard icon={<Shield size={14} />} label="Numéro de licence" value={certification?.licenseNumber ?? 'Non renseigné'} />
            {certification?.accreditation?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {certification.accreditation.map((a, i) => (
                  <span key={i} className="px-2.5 py-1 bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold rounded-lg">{a}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}