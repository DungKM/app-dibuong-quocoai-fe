import React from "react";
import BedCard from "./BedCard";
import type { Room, RoomGridProps, BedClickPayload } from "@/types/dibuong";

export const RoomGrid: React.FC<RoomGridProps> = ({
  filteredWard,
  searchTerm,
  onBedClick,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-12 md:gap-x-12 md:gap-y-16 ${className ?? ""}`}>
      {filteredWard.map((room) => (
        <RoomSection
          key={room.room}
          room={room}
          searchTerm={searchTerm}
          onBedClick={onBedClick}
        />
      ))}
    </div>
  );
};

type RoomSectionProps = {
  room: Room;
  searchTerm?: string;
  onBedClick: (payload: BedClickPayload) => void;
};

const RoomSection: React.FC<RoomSectionProps> = ({ room, searchTerm, onBedClick }) => {
  const totalPatientsInRoom = room.beds.reduce((acc, bed) => acc + (bed.patients?.length || 0), 0);
  if (totalPatientsInRoom === 0 && searchTerm) return null;

  const roomLabel = room.room.startsWith("Phòng")
    ? room.room.replace(/^Phòng\s*/i, "").trim()
    : room.room;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 md:gap-4 px-2 md:px-4">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 text-white rounded-[16px] md:rounded-[20px] flex items-center justify-center font-black text-lg md:text-xl shadow-lg border-2 md:border-4 border-white transform rotate-3">
          {room.room.replace(/\D/g, "")}
        </div>

        <div className="flex-1">
          <h3 className="font-black text-xl md:text-2xl text-slate-800 uppercase tracking-tighter leading-none mb-1">
            Phòng {roomLabel}
          </h3>
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <span>
              {totalPatientsInRoom}/{room.beds.length} Bệnh nhân
            </span>
          </div>
        </div>

        <div className="hidden sm:block h-px flex-1 bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {room.beds.map((bed, idx) => (
          <BedCard
            key={`${room.room}-${bed.code}-${idx}`}
            bedCode={bed.code}
            displayPatients={bed.patients || []}
            onClick={onBedClick}
          />
        ))}
      </div>
    </section>
  );
};