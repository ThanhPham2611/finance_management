"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Banner, MoneyInput } from "@/components/ui";
import { formatVND } from "@/lib/format";
import type { RealJar } from "@/lib/queries/jars";
import { MAX_HOUSEHOLD_MEMBERS, memberLabel, type HouseholdInfo } from "@/lib/queries/household";
import { createFamilyJar, createInvite, joinHousehold, setContribution, setNickname } from "@/app/(app)/household/actions";
import { deactivateJar } from "@/app/(app)/jars/[id]/edit/actions";

export type FamilyJarView = {
  jar: RealJar;
  contributions: { userId: string; name: string; amount: number }[];
};

export function HouseholdClient({
  household,
  familyJars,
  myUserId,
  memberLastSpend,
}: {
  household: HouseholdInfo;
  familyJars: FamilyJarView[];
  myUserId: string;
  memberLastSpend: Record<string, string>;
}) {
  const router = useRouter();
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const memberCount = household?.members.length ?? 0;
  const isFull = memberCount >= MAX_HOUSEHOLD_MEMBERS;

  async function handleCreateInvite() {
    setCreatingInvite(true);
    setInviteError(null);
    const result = await createInvite();
    setCreatingInvite(false);
    if (result.error) {
      setInviteError(result.error);
      return;
    }
    if (result.code && result.expiresAt) {
      setInvite({ code: result.code, expiresAt: result.expiresAt });
    }
    router.refresh();
  }

  async function handleJoin() {
    setJoining(true);
    setJoinError(null);
    const result = await joinHousehold(joinCode);
    setJoining(false);
    if (result.error) {
      setJoinError(result.error);
      return;
    }
    setJoinCode("");
    router.refresh();
  }

  async function handleCopy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API co the bi chan — bo qua, ma van hien tren man.
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3 border-b-2 border-divider pb-4">
        <h1 className="mr-auto text-xl md:text-2xl">Gia đình</h1>
      </div>

      <div className="border border-divider">
        <div className="border-b border-divider px-4 py-3">
          <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Thành viên</div>
        </div>
        {(household?.members ?? [{ userId: "me", name: "Bạn", nickname: null, isMe: true }]).map((m) => (
          <MemberRow key={m.userId} member={m} lastSpendAt={memberLastSpend[m.userId]} editable={!!household} />
        ))}
        {!isFull && (
          <div className="px-4 py-3 text-[13px] text-neutral-700">
            {household
              ? `Còn ${MAX_HOUSEHOLD_MEMBERS - memberCount} chỗ trống (tối đa ${MAX_HOUSEHOLD_MEMBERS} người).`
              : `Bạn chưa có gia đình nào — tạo mã mời để bắt đầu (tối đa ${MAX_HOUSEHOLD_MEMBERS} người).`}
          </div>
        )}
      </div>

      {isFull ? (
        <Banner icon="check" tone="green">
          Gia đình đã đủ {MAX_HOUSEHOLD_MEMBERS} thành viên.
        </Banner>
      ) : (
        <details className="border border-divider">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold select-none">Mời hoặc tham gia gia đình</summary>
          <div className="flex flex-col gap-4 border-t border-divider p-4">
            <div>
              <div className="text-sm font-semibold">Mời người thân</div>
              <p className="mt-1 text-[13px] text-neutral-700">Tạo mã mời rồi gửi cho người thân (qua Zalo, tin nhắn...). Mã dùng được trong 7 ngày.</p>

              {invite ? (
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="flex-1 border border-dashed border-divider px-3 py-2.5 text-center font-heading text-lg font-extrabold tracking-[0.15em]">
                    {invite.code}
                  </div>
                  <button type="button" onClick={handleCopy} className="btn btn-secondary" aria-label="Sao chép mã">
                    <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button type="button" disabled={creatingInvite} onClick={handleCreateInvite} className="btn btn-primary mt-3">
                  {creatingInvite ? "Đang tạo…" : "Tạo mã mời"}
                </button>
              )}
              {inviteError && (
                <p className="mt-2 text-xs" style={{ color: "var(--color-accent-700)" }}>
                  {inviteError}
                </p>
              )}
            </div>

            <div className="border-t border-divider pt-4">
              <div className="text-sm font-semibold">Có mã mời từ người thân?</div>
              <p className="mt-1 text-[13px] text-neutral-700">Nhập mã họ gửi cho bạn để tham gia gia đình của họ.</p>
              <div className="mt-3 flex items-center gap-2.5">
                <input
                  className="input flex-1 text-center tracking-[0.15em] uppercase"
                  placeholder="VD: A1B2C3D4"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  maxLength={8}
                />
                <button type="button" disabled={joining || !joinCode.trim()} onClick={handleJoin} className="btn btn-primary">
                  {joining ? "Đang tham gia…" : "Tham gia"}
                </button>
              </div>
              {joinError && (
                <p className="mt-2 text-xs" style={{ color: "var(--color-accent-700)" }}>
                  {joinError}
                </p>
              )}
            </div>
          </div>
        </details>
      )}

      {household && (
        <FamilyJarsSection familyJars={familyJars} myUserId={myUserId} />
      )}
    </div>
  );
}

function MemberRow({
  member,
  lastSpendAt,
  editable,
}: {
  member: { userId: string; name: string; nickname: string | null; isMe: boolean };
  lastSpendAt?: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nickname, setNicknameInput] = useState(member.nickname ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await setNickname(member.userId, nickname);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0">
      <div className="grid h-8 w-8 shrink-0 place-items-center bg-text text-[12px] font-semibold text-bg">
        {member.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="input flex-1"
              value={nickname}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="VD: vợ, chồng, bố…"
              maxLength={30}
            />
            <button type="button" disabled={saving} onClick={handleSave} className="btn btn-primary">
              {saving ? "Đang lưu…" : "Lưu"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
              Huỷ
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="truncate text-sm">{memberLabel(member)}</span>
            {editable && (
              <button type="button" onClick={() => setEditing(true)} className="text-[11px] text-neutral-700 underline shrink-0">
                {member.nickname ? "Sửa biệt danh" : "Đặt biệt danh"}
              </button>
            )}
          </div>
        )}
        {lastSpendAt && <div className="mt-0.5 text-[11px] text-neutral-700">Chi gần nhất: {lastSpendAt}</div>}
      </div>
    </div>
  );
}

function FamilyJarsSection({ familyJars, myUserId }: { familyJars: FamilyJarView[]; myUserId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    const result = await createFamilyJar({ name, icon: "home", color: "var(--color-accent)", alertAt80: true, rollover: false });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setCreating(false);
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-col gap-4 border-t-2 border-divider pt-4">
      <div className="flex items-center gap-3">
        <h2 className="mr-auto text-base font-semibold">Hũ gia đình</h2>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="btn btn-secondary">
            <Icon name="plus" className="h-4 w-4" />
            Tạo hũ gia đình
          </button>
        )}
      </div>

      {creating && (
        <div className="border border-divider p-4">
          <div className="field">
            <label htmlFor="family-jar-name">Tên hũ</label>
            <input
              id="family-jar-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Ăn uống chung, Hoá đơn nhà"
            />
          </div>
          {error && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-accent-700)" }}>
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
            >
              Huỷ
            </button>
            <button type="button" disabled={saving || !name.trim()} onClick={handleCreate} className="btn btn-primary flex-1 justify-center">
              {saving ? "Đang tạo…" : "Tạo hũ"}
            </button>
          </div>
        </div>
      )}

      {familyJars.length === 0 && !creating && (
        <p className="text-[13px] text-neutral-700">
          Chưa có hũ gia đình nào. Tạo một hũ (vd &ldquo;Ăn uống chung&rdquo;), rồi mỗi người tự nhập phần đóng góp của mình bên dưới.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {familyJars.map(({ jar, contributions }) => (
          <FamilyJarRow key={jar.id} jar={jar} contributions={contributions} myUserId={myUserId} />
        ))}
      </div>
    </div>
  );
}

function FamilyJarRow({
  jar,
  contributions,
  myUserId,
}: {
  jar: RealJar;
  contributions: { userId: string; name: string; amount: number }[];
  myUserId: string;
}) {
  const router = useRouter();
  const mine = contributions.find((c) => c.userId === myUserId);
  const [amount, setAmount] = useState(mine?.amount ?? 0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await setContribution(jar.id, amount);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Xoá hũ gia đình "${jar.name}"? Giao dịch cũ vẫn được giữ lại.`)) return;
    setDeleting(true);
    setError(null);
    const result = await deactivateJar(jar.id);
    setDeleting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  // Tong hien tai cua tat ca dong gop (dung de xem % ngay khi go, truoc khi luu).
  const liveTotal = contributions.reduce((sum, c) => sum + (c.userId === myUserId ? amount : c.amount), 0);
  const pctOf = (n: number) => (liveTotal ? Math.round((n / liveTotal) * 100) : 0);

  return (
    <div className="border border-divider p-4">
      <div className="flex items-center gap-2.5">
        <Icon name={jar.icon} className="h-4 w-4 shrink-0" style={{ color: jar.color }} />
        <Link href={`/jars/${jar.id}`} className="text-sm font-semibold hover:underline">
          {jar.name}
        </Link>
        <span className="text-[12px] tabular-nums text-neutral-700">· {formatVND(jar.monthlyBudget)}đ/tháng</span>
        <button type="button" disabled={deleting} onClick={handleDelete} aria-label={`Xoá hũ ${jar.name}`} title="Xoá hũ" className="ml-auto text-neutral-700 hover:text-accent-700">
          <Icon name="trash-2" className="h-4 w-4" />
        </button>
      </div>

      {/* Ai gop bao nhieu, bao nhieu % — luon hien, khong can bam luu moi thay. */}
      <div className="mt-3 flex flex-col gap-2">
        {contributions.map((c) => {
          const isMe = c.userId === myUserId;
          const shownAmount = isMe ? amount : c.amount;
          return (
            <div key={c.userId} className="flex items-center gap-2.5 text-[13px]">
              <span className="w-20 shrink-0 text-neutral-700">{c.name}</span>
              <div className="h-1.5 flex-1 bg-neutral-300">
                <div className="h-full" style={{ width: `${pctOf(shownAmount)}%`, background: jar.color }} />
              </div>
              <span className="w-32 shrink-0 text-right tabular-nums">
                {formatVND(shownAmount)}đ · {pctOf(shownAmount)}%
              </span>
            </div>
          );
        })}
      </div>

      <details className="mt-3 border-t border-divider pt-3">
        <summary className="cursor-pointer text-[12px] font-semibold select-none">Sửa phần góp của bạn</summary>
        <div className="mt-2 flex items-center gap-2.5">
          <MoneyInput
            id={`contrib-${jar.id}`}
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setSaved(false);
            }}
            className="input flex-1"
            placeholder="0"
            aria-label="Số tiền bạn góp mỗi tháng (VNĐ)"
          />
          <span className="shrink-0 text-[13px] text-neutral-700">đ</span>
          <button type="button" disabled={saving} onClick={handleSave} className="btn btn-primary shrink-0">
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-neutral-700">
          Nhập số tiền cụ thể (không phải %) — hệ thống tự cộng với phần của người kia để ra ngân sách tháng ở trên.
        </p>
      </details>

      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-2 text-xs" style={{ color: "var(--color-green-ink)" }}>
          Đã lưu phần đóng góp của bạn.
        </p>
      )}
    </div>
  );
}
