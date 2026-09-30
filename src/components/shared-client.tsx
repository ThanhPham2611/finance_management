"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IncomingShare, OutgoingShare } from "@/lib/queries/shares";
import { createShareRequest, respondToShare, revokeShare } from "@/app/(app)/shared/actions";

const STATUS_LABEL: Record<OutgoingShare["status"], string> = {
  pending: "Đang chờ",
  accepted: "Đã chấp nhận",
  declined: "Đã từ chối",
  revoked: "Đã huỷ",
};

export function SharedClient({
  incoming,
  accepted,
  outgoing,
}: {
  incoming: IncomingShare[];
  accepted: IncomingShare[];
  outgoing: OutgoingShare[];
}) {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div><p className="eyebrow">MINH BẠCH KHI BẠN CHỌN</p><h1>Chia sẻ chi tiêu</h1><p>Cho người tin cậy quyền xem, không trao quyền chỉnh sửa.</p></div>
      </div>

      <p className="text-sm text-neutral-700">
        Chia sẻ toàn bộ chi tiêu cá nhân của bạn cho một người khác — họ cần <span className="font-semibold">chấp nhận</span> mới xem được, và chỉ được xem, không
        thể sửa/xoá gì cả.
      </p>

      <InviteForm />

      {incoming.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Lời mời đang chờ bạn</div>
          <div className="overflow-hidden rounded-card border border-divider bg-surface shadow-sm">
            {incoming.map((s) => (
              <IncomingRow key={s.id} share={s} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Đang chia sẻ với tôi</div>
        {accepted.length === 0 ? (
          <p className="text-[13px] text-neutral-700">Chưa có ai chia sẻ chi tiêu với bạn.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-divider bg-surface shadow-sm">
            {accepted.map((s) => (
              <Link key={s.id} href={`/shared/${s.ownerId}`} className="flex items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0 hover:bg-surface">
                <div className="grid h-8 w-8 shrink-0 place-items-center bg-text text-[12px] font-semibold text-bg">
                  {s.ownerName.slice(0, 1).toUpperCase()}
                </div>
                <span className="flex-1 text-sm">{s.ownerName}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Bạn đang chia sẻ với</div>
        {outgoing.length === 0 ? (
          <p className="text-[13px] text-neutral-700">Bạn chưa chia sẻ chi tiêu với ai.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-divider bg-surface shadow-sm">
            {outgoing.map((s) => (
              <OutgoingRow key={s.id} share={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const result = await createShareRequest(email);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEmail("");
    router.refresh();
  }

  return (
    <div className="rounded-card border border-divider bg-surface p-4 shadow-sm">
      <div className="field">
        <label htmlFor="share-email">Email người bạn muốn chia sẻ</label>
        <input
          id="share-email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@email.com"
        />
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
      <button type="button" disabled={saving || !email.trim()} onClick={handleSubmit} className="btn btn-primary mt-3">
        {saving ? "Đang gửi…" : "Gửi lời mời"}
      </button>
    </div>
  );
}

function IncomingRow({ share }: { share: IncomingShare }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRespond(accept: boolean) {
    setSaving(true);
    setError(null);
    const result = await respondToShare(share.id, accept);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 border-b border-divider px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center bg-text text-[12px] font-semibold text-bg">{share.ownerName.slice(0, 1).toUpperCase()}</div>
        <span className="flex-1 text-sm">{share.ownerName} muốn chia sẻ chi tiêu với bạn</span>
        <button type="button" disabled={saving} onClick={() => handleRespond(true)} className="btn btn-primary">
          Chấp nhận
        </button>
        <button type="button" disabled={saving} onClick={() => handleRespond(false)} className="btn btn-secondary">
          Từ chối
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function OutgoingRow({ share }: { share: OutgoingShare }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setSaving(true);
    setError(null);
    const result = await revokeShare(share.id);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 border-b border-divider px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm">{share.viewerName}</span>
        <span className="text-[11px] text-neutral-700">{STATUS_LABEL[share.status]}</span>
        {share.status !== "declined" && (
          <button type="button" disabled={saving} onClick={handleRevoke} className="btn btn-secondary">
            {saving ? "Đang huỷ…" : "Huỷ chia sẻ"}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
