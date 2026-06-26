import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, FolderHeart, Sparkles, Compass, UserCheck, Settings2, Calendar } from 'lucide-react';

// Custom Modules
import { ThemePreset, MemoryItem, FamilyMember } from './types';
import { INITIAL_MEMORIES, INITIAL_CHAPTERS, INITIAL_FAMILY_MEMBERS, THEME_COLORS } from './data';
import BackgroundForest from './components/BackgroundForest';
import MagicalEntrance from './components/MagicalEntrance';
import LandingPage from './components/LandingPage';
import MediaGallery from './components/MediaGallery';
import StorageVault from './components/StorageVault';
import RoyalCircle from './components/RoyalCircle';
import VideoPlayer from './components/VideoPlayer';
import PhotoViewer from './components/PhotoViewer';
import SettingsChamber from './components/SettingsChamber';
import MemoryConstellation from './components/MemoryConstellation';
import ScrollTimeline from './components/ScrollTimeline';

import { 
  getLocalMemories, 
  saveLocalMemory, 
  deleteLocalMemory, 
  LocalMemoryRecord,
  getAppConfig,
  saveAppConfig,
  getKeeperProfile,
  saveKeeperProfile,
  getGroupMembers,
  saveGroupMember,
  deleteGroupMember,
  KeeperProfile,
  LocalGroupMember
} from './lib/db';

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'gallery' | 'constellation' | 'timeline' | 'storage' | 'royal' | 'settings' | 'photo' | 'video'>('landing');

  // Master Lists state
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [chapters, setChapters] = useState(INITIAL_CHAPTERS);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(INITIAL_FAMILY_MEMBERS);

  // Active selections
  const [selectedPhotoItem, setSelectedPhotoItem] = useState<MemoryItem | null>(null);
  const [selectedVideoItem, setSelectedVideoItem] = useState<MemoryItem | null>(null);

  // Customizable Landing Texts state
  const [landingHeading, setLandingHeading] = useState("WELCOME TO \nFILLORY NIEL");
  const [landingSub, setLandingSub] = useState("“Every Memory Has A Story Worth Preserving.”");

  // Editable Keeper Profile state
  const [keeperProfile, setKeeperProfile] = useState<KeeperProfile>({
    id: 'active-keeper',
    name: 'Keeper gwcapung',
    email: 'gwcapung@gmail.com',
    councilTitle: 'Chief Archivist of the Clockwork',
    realmDominion: 'Sovereign High Court, Castle Fillory',
    avatarUrl: 'https://picsum.photos/seed/keeper_niel/400/400'
  });

  // Dynamic Theme Preset state
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>('Forest Night');
  const activeColors = THEME_COLORS[currentTheme];

  // Load local memories and all customizations from IndexedDB on component mount
  useEffect(() => {
    const loadAllDatabaseRecords = async () => {
      try {
        // 1. Memories
        const localRecords = await getLocalMemories();
        const localMemories: MemoryItem[] = localRecords.map(record => {
          const objectUrl = URL.createObjectURL(record.file);
          return {
            id: record.id,
            title: record.title,
            type: record.type,
            url: objectUrl,
            thumbnailUrl: objectUrl,
            chapter: record.chapter,
            date: record.date,
            description: record.description,
            tags: record.tags,
            constellationPos: record.constellationPos,
          };
        });

        setMemories((prev) => {
          const prevIds = new Set(prev.map(m => m.id));
          const nonDupes = localMemories.filter(m => !prevIds.has(m.id));
          return [...prev, ...nonDupes];
        });

        // 2. App Config (Landing text)
        const config = await getAppConfig();
        if (config) {
          if (config.landingHeading) setLandingHeading(config.landingHeading);
          if (config.landingSub) setLandingSub(config.landingSub);
        }

        // 3. Keeper Profile
        const profile = await getKeeperProfile();
        let displayProfile = keeperProfile;
        if (profile) {
          let url = profile.avatarUrl;
          if (profile.avatarFile) {
            url = URL.createObjectURL(profile.avatarFile);
          }
          displayProfile = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            councilTitle: profile.councilTitle,
            realmDominion: profile.realmDominion,
            avatarFile: profile.avatarFile,
            avatarUrl: url || profile.avatarUrl,
          };
          setKeeperProfile(displayProfile);
        }

        // 4. Dynamic Group/Council Members
        const customMembers = await getGroupMembers();
        const dynamicMembers: FamilyMember[] = customMembers.map(m => {
          const url = m.avatarFile ? URL.createObjectURL(m.avatarFile) : m.avatarUrl;
          return {
            id: m.id,
            name: m.name,
            role: m.role,
            avatarUrl: url || 'https://picsum.photos/seed/goth_mage/400/400',
            privateVault: m.privateVault,
            permissionLevel: m.permissionLevel,
          };
        });

        // Map initial base family members (update keeper in initial list with updated keeperProfile state if present)
        const baseMembersMapped = INITIAL_FAMILY_MEMBERS.map(m => {
          if (m.id === 'char-1') {
            return {
              ...m,
              name: displayProfile.name,
              role: displayProfile.councilTitle,
              avatarUrl: displayProfile.avatarUrl || m.avatarUrl,
            };
          }
          return m;
        });

        setFamilyMembers([...baseMembersMapped, ...dynamicMembers]);

      } catch (err) {
        console.error('Failed to restore archive session records from IndexedDB:', err);
      }
    };

    loadAllDatabaseRecords();
  }, []);

  const handleUploadMemory = async (record: LocalMemoryRecord) => {
    try {
      await saveLocalMemory(record);
      const objectUrl = URL.createObjectURL(record.file);
      const newMemory: MemoryItem = {
        id: record.id,
        title: record.title,
        type: record.type,
        url: objectUrl,
        thumbnailUrl: objectUrl,
        chapter: record.chapter,
        date: record.date,
        description: record.description,
        tags: record.tags,
        constellationPos: record.constellationPos,
      };

      setMemories((prev) => [newMemory, ...prev]);
    } catch (err) {
      console.error('Failed to save memory to IndexedDB:', err);
      throw err;
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await deleteLocalMemory(id);
      const target = memories.find(m => m.id === id);
      if (target && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      setMemories((prev) => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to purge local memory scroll:', err);
    }
  };

  // Customizable Landing Text Saved to IndexedDB
  const handleUpdateLandingText = async (heading: string, sub: string) => {
    try {
      await saveAppConfig({ id: 'landing-config', landingHeading: heading, landingSub: sub });
      setLandingHeading(heading);
      setLandingSub(sub);
    } catch (err) {
      console.error('Failed to preserve landing configs:', err);
      throw err;
    }
  };

  // Editable Profile Saved to IndexedDB
  const handleUpdateKeeperProfile = async (profile: KeeperProfile) => {
    try {
      await saveKeeperProfile(profile);
      
      if (keeperProfile.avatarUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(keeperProfile.avatarUrl);
      }
      
      let displayUrl = profile.avatarUrl || 'https://picsum.photos/seed/keeper_niel/400/400';
      if (profile.avatarFile) {
        displayUrl = URL.createObjectURL(profile.avatarFile);
      }
      
      const updatedProfile = {
        ...profile,
        avatarUrl: displayUrl
      };
      
      setKeeperProfile(updatedProfile);

      // Keep the main seat character synced with active keeper settings
      setFamilyMembers(prev => prev.map(m => {
        if (m.id === 'char-1') {
          return {
            ...m,
            name: profile.name,
            role: profile.councilTitle,
            avatarUrl: displayUrl
          };
        }
        return m;
      }));
    } catch (err) {
      console.error('Failed to save credentials profile:', err);
      throw err;
    }
  };

  // Dynamic Group/Circle Members Saved to IndexedDB
  const handleAddGroupMember = async (member: LocalGroupMember) => {
    try {
      await saveGroupMember(member);
      const objectUrl = member.avatarFile ? URL.createObjectURL(member.avatarFile) : member.avatarUrl;
      const newFamily: FamilyMember = {
        id: member.id,
        name: member.name,
        role: member.role,
        avatarUrl: objectUrl || 'https://picsum.photos/seed/goth_mage/400/400',
        privateVault: member.privateVault,
        permissionLevel: member.permissionLevel,
      };
      setFamilyMembers(prev => [...prev, newFamily]);
    } catch (err) {
      console.error('Failed to add dynamic group member:', err);
      throw err;
    }
  };

  const handleEditGroupMember = async (member: LocalGroupMember) => {
    try {
      await saveGroupMember(member);
      const objectUrl = member.avatarFile ? URL.createObjectURL(member.avatarFile) : member.avatarUrl;
      
      const old = familyMembers.find(m => m.id === member.id);
      if (old && old.avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(old.avatarUrl);
      }

      setFamilyMembers(prev => prev.map(m => {
        if (m.id === member.id) {
          return {
            ...m,
            name: member.name,
            role: member.role,
            avatarUrl: objectUrl || m.avatarUrl,
            privateVault: member.privateVault,
            permissionLevel: member.permissionLevel,
          };
        }
        return m;
      }));
    } catch (err) {
      console.error('Failed to edit group member:', err);
      throw err;
    }
  };

  const handleDeleteGroupMember = async (id: string) => {
    try {
      await deleteGroupMember(id);
      const target = familyMembers.find(m => m.id === id);
      if (target && target.avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.avatarUrl);
      }
      setFamilyMembers(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete group member:', err);
      throw err;
    }
  };

  // Soft ambient chime on entered
  const playEntrySpellSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5); // slide to high A5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
      // AudioContext barred in some sandbox frames, fail silently
    }
  };

  const handleEntranceComplete = () => {
    setHasEntered(true);
    playEntrySpellSound();
  };

  const handleAddChapter = (newChap: any) => {
    setChapters((prev) => [newChap, ...prev]);
  };

  return (
    <div
      style={{
        backgroundColor: activeColors.primaryBg,
        color: activeColors.textMain,
      }}
      className="min-h-screen transition-colors duration-[1.5s] relative overflow-x-hidden font-sans select-none"
      id="fillory-vault-root"
    >
      
      {/* 1. Global Interactive Forest Canvas Background */}
      {hasEntered && <BackgroundForest />}

      {/* 2. Interactive Door Unsealing Entrance Stage */}
      <AnimatePresence>
        {!hasEntered && (
          <MagicalEntrance onComplete={handleEntranceComplete} />
        )}
      </AnimatePresence>

      {/* 3. Global Master Interface Wrapper (rendered once entered) */}
      {hasEntered && (
        <div className="relative z-10 flex flex-col min-h-screen justify-between">
          
          {/* A. Master Glassy Header Navbar */}
          {currentScreen !== 'landing' && (
            <motion.header
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              style={{
                backgroundColor: activeColors.glassBg,
                borderColor: `${activeColors.accentGold}25`,
              }}
              className="sticky top-0 z-40 backdrop-blur-md border-b px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            >
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Brand Logo & Current Theme Stamp */}
                <div
                  onClick={() => setCurrentScreen('landing')}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <div className="p-1.5 rounded bg-gradient-to-br from-[#D7BB7A] to-[#C7A86D] text-[#111512] shadow-md group-hover:scale-105 transition-transform">
                    <Shield className="w-5 h-5 fill-[#111512]" />
                  </div>
                  <div>
                    <h1 className="font-serif text-base font-bold tracking-wider text-[#E9DFC8] group-hover:text-[#C7A86D] transition-colors leading-none">
                      FILLORY NIEL
                    </h1>
                    <span className="text-[8px] font-mono tracking-widest text-[#9E9E8E] uppercase block">
                      Realm Theme: {currentTheme}
                    </span>
                  </div>
                </div>

                {/* Navigation Hub Tabs */}
                <nav className="flex flex-wrap items-center justify-center gap-1 bg-[#0B0C0A]/40 p-1 rounded-full border border-[#C7A86D]/15">
                  {/* Catalog (Gallery) */}
                  <button
                    onClick={() => setCurrentScreen('gallery')}
                    className={`px-4 py-2 rounded-full text-[10px] tracking-wider uppercase font-sans font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      currentScreen === 'gallery'
                        ? 'bg-gradient-to-r from-[#D7BB7A] to-[#C7A86D] text-[#111512]'
                        : 'text-[#9E9E8E] hover:text-[#E9DFC8]'
                    }`}
                  >
                    <FolderHeart className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Catalog</span>
                  </button>

                  {/* Constellations */}
                  <button
                    onClick={() => setCurrentScreen('constellation')}
                    className={`px-4 py-2 rounded-full text-[10px] tracking-wider uppercase font-sans font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      currentScreen === 'constellation'
                        ? 'bg-gradient-to-r from-[#D7BB7A] to-[#C7A86D] text-[#111512]'
                        : 'text-[#9E9E8E] hover:text-[#E9DFC8]'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Constellations</span>
                  </button>

                  {/* Time Travel */}
                  <button
                    onClick={() => setCurrentScreen('timeline')}
                    className={`px-4 py-2 rounded-full text-[10px] tracking-wider uppercase font-sans font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      currentScreen === 'timeline'
                        ? 'bg-gradient-to-r from-[#D7BB7A] to-[#C7A86D] text-[#111512]'
                        : 'text-[#9E9E8E] hover:text-[#E9DFC8]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Time Travel</span>
                  </button>

                  {/* Arcane Storage */}
                  <button
                    onClick={() => setCurrentScreen('storage')}
                    className={`px-4 py-2 rounded-full text-[10px] tracking-wider uppercase font-sans font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      currentScreen === 'storage'
                        ? 'bg-gradient-to-r from-[#D7BB7A] to-[#C7A86D] text-[#111512]'
                        : 'text-[#9E9E8E] hover:text-[#E9DFC8]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Storage Crystal</span>
                  </button>

                  {/* Royal Circle */}
                  <button
                    onClick={() => setCurrentScreen('royal')}
                    className={`px-4 py-2 rounded-full text-[10px] tracking-wider uppercase font-sans font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      currentScreen === 'royal'
                        ? 'bg-gradient-to-r from-[#D7BB7A] to-[#C7A86D] text-[#111512]'
                        : 'text-[#9E9E8E] hover:text-[#E9DFC8]'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Council</span>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => setCurrentScreen('settings')}
                    className={`px-4 py-2 rounded-full text-[10px] tracking-wider uppercase font-sans font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      currentScreen === 'settings'
                        ? 'bg-gradient-to-r from-[#D7BB7A] to-[#C7A86D] text-[#111512]'
                        : 'text-[#9E9E8E] hover:text-[#E9DFC8]'
                    }`}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Settings</span>
                  </button>
                </nav>
              </div>
            </motion.header>
          )}

          {/* B. Core Interactive Screen Router Body */}
          <main className="flex-1 w-full relative z-10 flex flex-col justify-center py-6">
            <AnimatePresence mode="wait">
              {currentScreen === 'landing' && (
                <motion.div
                  key="landing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full"
                >
                  <LandingPage
                    onEnterVault={() => setCurrentScreen('gallery')}
                    memories={memories}
                    landingHeading={landingHeading}
                    landingSub={landingSub}
                    onUpdateLandingText={handleUpdateLandingText}
                  />
                </motion.div>
              )}

              {currentScreen === 'gallery' && (
                <motion.div
                  key="gallery"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full animate-fadeIn"
                >
                  <MediaGallery
                    memories={memories}
                    chapters={chapters}
                    onSelectPhoto={(photo) => {
                      setSelectedPhotoItem(photo);
                      setCurrentScreen('photo');
                    }}
                    onSelectVideo={(video) => {
                      setSelectedVideoItem(video);
                      setCurrentScreen('video');
                    }}
                    onAddChapter={handleAddChapter}
                    onUploadMemory={handleUploadMemory}
                    onDeleteMemory={handleDeleteMemory}
                  />
                </motion.div>
              )}

              {currentScreen === 'constellation' && (
                <motion.div
                  key="constellation"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full"
                >
                  <MemoryConstellation
                    memories={memories}
                    onSelectPhoto={(photo) => {
                      setSelectedPhotoItem(photo);
                      setCurrentScreen('photo');
                    }}
                    onSelectVideo={(video) => {
                      setSelectedVideoItem(video);
                      setCurrentScreen('video');
                    }}
                  />
                </motion.div>
              )}

              {currentScreen === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full"
                >
                  <ScrollTimeline
                    memories={memories}
                    onSelectPhoto={(photo) => {
                      setSelectedPhotoItem(photo);
                      setCurrentScreen('photo');
                    }}
                    onSelectVideo={(video) => {
                      setSelectedVideoItem(video);
                      setCurrentScreen('video');
                    }}
                  />
                </motion.div>
              )}

              {currentScreen === 'storage' && (
                <motion.div
                  key="storage"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full animate-fadeIn"
                >
                  <StorageVault />
                </motion.div>
              )}

              {currentScreen === 'royal' && (
                <motion.div
                  key="royal"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full animate-fadeIn"
                >
                  <RoyalCircle 
                    members={familyMembers}
                    onAddMember={handleAddGroupMember}
                    onDeleteMember={handleDeleteGroupMember}
                    onEditMember={handleEditGroupMember}
                  />
                </motion.div>
              )}

              {currentScreen === 'video' && selectedVideoItem && (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full"
                >
                  <VideoPlayer
                    item={selectedVideoItem}
                    onBackToGallery={() => setCurrentScreen('gallery')}
                  />
                </motion.div>
              )}

              {currentScreen === 'photo' && selectedPhotoItem && (
                <motion.div
                  key="photo"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full"
                >
                  <PhotoViewer
                    item={selectedPhotoItem}
                    photos={memories.filter(m => m.type === 'photo')}
                    onBackToGallery={() => setCurrentScreen('gallery')}
                    onSelectPhoto={(photo) => setSelectedPhotoItem(photo)}
                  />
                </motion.div>
              )}

              {currentScreen === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full animate-fadeIn"
                >
                  <SettingsChamber
                    currentTheme={currentTheme}
                    onThemeChange={(newTheme) => setCurrentTheme(newTheme)}
                    keeperProfile={keeperProfile}
                    onUpdateKeeperProfile={handleUpdateKeeperProfile}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* C. Subdued, Editorial Footer */}
          <footer
            style={{ borderColor: `${activeColors.accentGold}15` }}
            className="w-full py-6 mt-12 text-center border-t border-dashed"
          >
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-[#9E9E8E] font-mono uppercase tracking-widest opacity-60">
              <span>Sovereign Keeper: {keeperProfile.email}</span>
              <span className="flex items-center space-x-2">
                <span>Fillory Niel Storage Engine v1.0.4</span>
              </span>
              <span>Castle Library Records, Fillory Realm</span>
            </div>
          </footer>

        </div>
      )}

    </div>
  );
}
