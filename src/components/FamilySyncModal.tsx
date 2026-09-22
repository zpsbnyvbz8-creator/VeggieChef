import React, { useState } from 'react';
import { 
  Users, 
  Smartphone, 
  Cloud, 
  Copy, 
  Check, 
  X, 
  ArrowRight, 
  LogOut, 
  ShieldCheck, 
  RefreshCw,
  Sparkles,
  Share2
} from 'lucide-react';
import { SyncConfig, sanitizeGroupId, generateSecureFamilyCode } from '../lib/syncService';
import { safeCopyToClipboard } from '../utils/helpers';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { useSync } from '../context/SyncContext';
import { useShopping } from '../context/ShoppingContext';
import { usePlanner } from '../context/PlannerContext';
import { useRecipes } from '../context/RecipeContext';

interface FamilySyncModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  syncConfig?: SyncConfig;
  onJoinFamily?: (groupId: string, groupName: string, memberName: string, pushData: boolean) => Promise<void>;
  onLeaveFamily?: () => void;
  onForcePushCurrentData?: () => Promise<void>;
}

export const FamilySyncModal: React.FC<FamilySyncModalProps> = (props) => {
  const syncCtx = useSync();
  const shoppingCtx = useShopping();
  const plannerCtx = usePlanner();
  const recipesCtx = useRecipes();

  const isOpen = props.isOpen !== undefined ? props.isOpen : syncCtx.isSyncModalOpen;
  const onClose = props.onClose ?? syncCtx.closeSyncModal;
  const syncConfig = props.syncConfig ?? syncCtx.syncConfig;
  const onJoinFamily = props.onJoinFamily ?? ((groupId, groupName, memberName, pushData) =>
    syncCtx.joinFamily(groupId, groupName, memberName, pushData, {
      shoppingItems: shoppingCtx.items,
      mealPlan: plannerCtx.mealPlan,
      recipes: recipesCtx.recipes,
    })
  );
  const onLeaveFamily = props.onLeaveFamily ?? syncCtx.leaveFamily;
  const onForcePushCurrentData = props.onForcePushCurrentData ?? (() =>
    syncCtx.forcePushData({
      shoppingItems: shoppingCtx.items,
      mealPlan: plannerCtx.mealPlan,
      recipes: recipesCtx.recipes,
    })
  );
  const [groupIdInput, setGroupIdInput] = useState(() => syncConfig.groupId || generateSecureFamilyCode());
  const [groupNameInput, setGroupNameInput] = useState(syncConfig.groupName || 'Unsere Familie');
  const [memberNameInput, setMemberNameInput] = useState(syncConfig.memberName || '');
  const [pushExistingData, setPushExistingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const isFamilyActive = syncConfig.mode === 'family' && Boolean(syncConfig.groupId);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = sanitizeGroupId(groupIdInput);
    if (!cleanId) return;

    setIsSubmitting(true);
    try {
      await onJoinFamily(cleanId, groupNameInput.trim() || 'Unsere Familie', memberNameInput.trim(), pushExistingData);
      onClose();
    } catch (err) {
      console.error('Join family error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!syncConfig.groupId) return;
    await safeCopyToClipboard(syncConfig.groupId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteText = async () => {
    const code = syncConfig.groupId || sanitizeGroupId(groupIdInput);
    const text = `Hey! 👋 Hier ist unser Familien-Code für VeggieChef: ${code}\n\nEinfach in der VeggieChef-App oben auf „Familien-Sync“ tippen, den Code eingeben und schon haben wir unsere Einkaufsliste & den Wochenplan in Echtzeit geteilt!`;
    await safeCopyToClipboard(text);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleSyncDataNow = async () => {
    setIsSubmitting(true);
    try {
      await onForcePushCurrentData();
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto touch-none overscroll-contain animate-in fade-in duration-150"
    >
      <div 
        id="family-sync-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#ECEBE8] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 overscroll-contain"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#FAF9F6] border-b border-[#ECEBE8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFamilyActive ? 'bg-[#4A7856] text-white' : 'bg-[#F1F5F2] text-[#4A7856]'}`}>
              {isFamilyActive ? <Cloud className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#2D3E40]">
                {isFamilyActive ? 'Familien-Synchronisation' : 'Synchronisation & Geräte'}
              </h2>
              <p className="text-xs text-[#7A7E7B]">
                {isFamilyActive 
                  ? `Verbunden mit „${syncConfig.groupName || syncConfig.groupId}“`
                  : 'Getrennt für Freunde oder gemeinsam mit der Familie'}
              </p>
            </div>
          </div>
          <button
            id="close-sync-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white text-[#7A7E7B] hover:text-[#2D3E40] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isFamilyActive 
              ? 'bg-[#F1F5F2] border-[#4A7856]/30 text-[#2D3E40]' 
              : 'bg-[#FAF9F6] border-[#ECEBE8] text-[#2D3E40]'
          }`}>
            <div className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${isFamilyActive ? 'bg-[#4A7856] animate-pulse' : 'bg-gray-400'}`} />
            <div className="text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                {isFamilyActive ? (
                  <>
                    <span>🟢 Echtzeit-Synchronisation aktiv</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-[#4A7856] font-mono text-xs font-semibold border border-[#ECEBE8]">
                      Code: {syncConfig.groupId}
                    </span>
                  </>
                ) : (
                  <>
                    <span>⚪ Lokaler Modus (Getrennt & Offline)</span>
                  </>
                )}
              </div>
              <p className="text-[#7A7E7B] leading-relaxed">
                {isFamilyActive 
                  ? 'Alle iPhones mit diesem Code teilen sich die Einkaufsliste, den Wochenplan und eigene Rezepte live in Echtzeit.'
                  : 'Deine Daten bleiben ausschließlich auf diesem iPhone. Freunde und Gäste können die App so völlig unabhängig von dir nutzen.'}
              </p>
            </div>
          </div>

          {isFamilyActive ? (
            /* ACTIVE FAMILY VIEW */
            <div className="space-y-4">
              <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#ECEBE8] space-y-3">
                <div className="text-xs font-semibold text-[#7A7E7B] uppercase tracking-wider">
                  Familien-Code zum Einladen
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-[#ECEBE8] px-3.5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#2D3E40] select-all">
                    {syncConfig.groupId}
                  </div>
                  <button
                    id="copy-group-id-btn"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] text-xs font-semibold shadow-2xs transition-all"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-[#4A7856]" /> : <Copy className="w-4 h-4 text-[#7A7E7B]" />}
                    <span>{copiedCode ? 'Kopiert' : 'Code'}</span>
                  </button>
                  <button
                    id="copy-invite-msg-btn"
                    onClick={handleCopyInviteText}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#4A7856] text-white hover:bg-[#3D6447] text-xs font-semibold shadow-xs transition-all"
                    title="Einladungstext für WhatsApp kopieren"
                  >
                    {copiedInvite ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedInvite ? 'Kopiert!' : 'Teilen'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#7A7E7B]">
                  Teile diesen Code mit deiner Familie per WhatsApp oder Nachricht. Jeder, der diesen Code eingibt, sieht dieselbe Einkaufsliste & Wochenplan.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  id="force-sync-push-btn"
                  onClick={handleSyncDataNow}
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#ECEBE8] hover:bg-[#F1F5F2] text-[#2D3E40] text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer touch-manipulation active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 text-[#4A7856] ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{pushSuccess ? '✓ Erfolgreich hochgeladen!' : 'Lokale Daten jetzt hochladen'}</span>
                </button>

                <button
                  id="leave-family-btn"
                  onClick={onLeaveFamily}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FDF6F0] hover:bg-rose-50 text-[#D35400] text-xs font-semibold border border-rose-200 transition-colors cursor-pointer touch-manipulation active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Zu lokalem Modus wechseln</span>
                </button>
              </div>
            </div>
          ) : (
            /* CONNECT TO FAMILY VIEW */
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#2D3E40]">
                      Familien-Code (14 Zeichen)
                    </label>
                    <button
                      type="button"
                      onClick={() => setGroupIdInput(generateSecureFamilyCode())}
                      className="text-[11px] font-medium text-[#4A7856] hover:underline cursor-pointer"
                    >
                      Neuen Code würfeln
                    </button>
                  </div>
                  <input
                    id="input-family-code"
                    type="text"
                    value={groupIdInput}
                    onChange={(e) => setGroupIdInput(e.target.value)}
                    placeholder="z.B. 7m2p9x4w8k3qzt"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-[#ECEBE8] text-sm text-[#2D3E40] font-mono focus:border-[#4A7856] focus:ring-1 focus:ring-[#4A7856] outline-hidden shadow-2xs"
                    required
                  />
                  <p className="text-[11px] text-[#7A7E7B] mt-1">
                    Zufälliger, nicht erratbarer Sicherheitscode. Gib diesen Code auf deinen anderen iPhones oder iPads ein.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3E40] mb-1.5">
                      Name der Gruppe (optional)
                    </label>
                    <input
                      id="input-group-name"
                      type="text"
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      placeholder="Unsere Familie"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white border border-[#ECEBE8] text-xs text-[#2D3E40] focus:border-[#4A7856] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2D3E40] mb-1.5">
                      Dein Name (optional)
                    </label>
                    <input
                      id="input-member-name"
                      type="text"
                      value={memberNameInput}
                      onChange={(e) => setMemberNameInput(e.target.value)}
                      placeholder="z.B. Mama, Felix..."
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white border border-[#ECEBE8] text-xs text-[#2D3E40] focus:border-[#4A7856] outline-hidden"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAF9F6] border border-[#ECEBE8] cursor-pointer hover:bg-[#F1F5F2]/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={pushExistingData}
                    onChange={(e) => setPushExistingData(e.target.checked)}
                    className="w-5 h-5 rounded text-[#4A7856] accent-[#4A7856]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-[#2D3E40]">Aktuelle Einkäufe & Wochenplan übernehmen</span>
                    <p className="text-[11px] text-[#7A7E7B]">Lädt deine vorhandenen Rezepte und Einkaufsliste direkt für die Familie hoch.</p>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  id="submit-join-family-btn"
                  disabled={isSubmitting || !groupIdInput.trim()}
                  className="flex-1 min-h-[46px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer touch-manipulation active:scale-95"
                >
                  <span>{isSubmitting ? 'Verbinde...' : 'Mit Familie verbinden'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Quick Guide */}
          <div className="border-t border-[#ECEBE8] pt-4 space-y-2">
            <h3 className="text-xs font-bold text-[#2D3E40] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#4A7856]" />
              <span>Wie Freunde & Familie die App nutzen</span>
            </h3>
            <ul className="text-xs text-[#7A7E7B] space-y-1.5 pl-1">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#4A7856]">•</span>
                <span><strong>Freunde:</strong> Lassen den Modus einfach auf <em>„Lokal“</em>. Sie können die App frei nutzen, ohne eure Familiendaten zu sehen oder zu verändern.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#4A7856]">•</span>
                <span><strong>Familie:</strong> Jeder gibt einmalig euren Familien-Code ein. Wenn Mama im Supermarkt ist und Hafermilch abhakt, verschwindet sie sofort auf Papas iPhone.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#4A7856]">•</span>
                <span><strong>Offline-Sicher:</strong> Auch im Supermarkt ohne Empfang bleibt alles auf dem iPhone gespeichert und gleicht sich ab, sobald wieder Netz da ist.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
