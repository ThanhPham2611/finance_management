// Skeleton hien ngay khi bam link — moi route trong (app) deu dynamic (doc
// cookie), khong co file nay thi trinh duyet phai doi server render xong
// toan bo trang moi chuyen, cam giac "bam khong an" 1-2s.
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5" aria-busy="true" aria-label="Đang tải">
      <div className="h-7 w-48 border-b-2 border-divider bg-neutral-200 pb-4" />
      <div className="h-10 w-40 bg-neutral-200" />
      <div className="grid grid-cols-2 gap-px sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-24 bg-neutral-200" />
        ))}
      </div>
      <div className="h-40 bg-neutral-200" />
    </div>
  );
}
