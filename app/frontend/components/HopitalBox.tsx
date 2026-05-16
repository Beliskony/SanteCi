import { Users, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { IHospitalClinic } from "@/app/server/interfaces/hopitalClinic.interface";

interface HopitalBoxProps {
  hospital: Pick<IHospitalClinic, "_id" | "name" | "type" | "location" | "staff"> & {
    imageCover?: { url: string; publicId: string };
  };
}

const typeLabel: Record<IHospitalClinic["type"], string> = {
  hospital:       "Hôpital",
  clinic:         "Clinique privée",
  pharmacy:       "Pharmacie",
  laboratory:     "Laboratoire",
  imaging_center: "Centre d'imagerie",
};

const HopitalBox = ({ hospital }: HopitalBoxProps) => {
  const { _id, name, type, location, staff, imageCover } = hospital;

  return (
    <Link
      href={`/hospitals/${_id}`}
      className="flex flex-col w-96 my-1.5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden"
    >
      {/* Image */}
      <div className="relative h-40 w-full overflow-hidden bg-gray-100">
        <img
          src={imageCover?.url || "/hospitals/default.jpg"}
          alt={name}
          className="w-full h-full object-cover"
        />
        <span className="absolute top-3 left-3 bg-white text-gray-700 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
          {typeLabel[type]}
        </span>
      </div>

      {/* Infos */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-base font-bold text-gray-900">{name}</h3>

        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin size={14} className="shrink-0" />
          <span>{location.district}, {location.city}</span>
        </div>

        <hr className="border-gray-200 my-1" />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-sm text-[#1e3a8a]">
            <Users size={15} className="shrink-0" />
            <span>{staff?.doctors?.length || 0} Médecins</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>Voir</span>
            <ArrowRight size={15} />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default HopitalBox;