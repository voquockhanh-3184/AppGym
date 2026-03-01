import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  UIManager
} from 'react-native';
import Video from 'react-native-video';
import YoutubePlayer from "react-native-youtube-iframe"; 

// Kích hoạt LayoutAnimation cho Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const TAB_MARGIN = 20;
const TAB_PADDING = 4;
const TAB_WIDTH = (width - (TAB_MARGIN * 2) - (TAB_PADDING * 2)) / 3;

interface ExerciseInfoModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: any; 
  onAddToSelection?: (id: number) => void;
}

const ExerciseInfoModal = ({ visible, onClose, exercise, onAddToSelection }: ExerciseInfoModalProps) => {
  if (!exercise) return null;

  const [activeTab, setActiveTab] = useState<'animation' | 'muscle' | 'instruction'>('animation');
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [playing, setPlaying] = useState(false); 

  // --- ANIMATION VALUES ---
  const slideAnim = useRef(new Animated.Value(0)).current; 
  const fadeAnim = useRef(new Animated.Value(1)).current; 

  const colors = {
    blue: "#007AFF",
    grayBg: "#F2F4F8",
    text: "#1F2937",
    subText: "#6B7280"
  };

  const handleTabChange = (tab: 'animation' | 'muscle' | 'instruction', index: number) => {
      Animated.spring(slideAnim, {
          toValue: index * TAB_WIDTH,
          useNativeDriver: true,
          bounciness: 8,
          speed: 12
      }).start();

      Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
      }).start(() => {
          setActiveTab(tab);
          setVideoError(false);
          setVideoLoading(true);
          // Nếu chuyển sang animation thì tự động play, các tab khác thì dừng
          setPlaying(tab === 'animation');
          
          Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
          }).start();
      });
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  const formatTime = (time: any) => {
    if (!time) return "00:00";
    const str = String(time);
    if (str.includes(":")) return str; 
    const total = parseInt(str, 10);
    if (isNaN(total)) return "00:00";
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const focusTags = useMemo(() => {
      if (!exercise.focus_area) return [];
      try {
          return typeof exercise.focus_area === 'string' 
            ? JSON.parse(exercise.focus_area) 
            : exercise.focus_area;
      } catch (e) {
          return [];
      }
  }, [exercise.focus_area]);

  // --- COMPONENT HIỂN THỊ VIDEO ---
  const renderVideoPlayer = (uri: string, autoPlay: boolean = false, isLoop: boolean = false, showControls: boolean = true) => {
      const youtubeId = getYoutubeId(uri);

      if (youtubeId) {
          return (
              <View style={styles.videoWrapper}>
                  <YoutubePlayer
                    height={width * 0.6} 
                    width={width}
                    play={!showControls ? true : playing} // Animation luôn play nếu ẩn control
                    videoId={youtubeId}
                    onChangeState={(state: string) => { 
                        if (state === "ended" && isLoop) {
                            setPlaying(true); 
                        }
                    }}
                    initialPlayerParams={{
                        controls: showControls, 
                        modestbranding: true,
                        rel: false, 
                        loop: isLoop
                    }}
                  />
                  {!showControls ? (
                      <View style={styles.touchBlocker} />
                  ) : (
                      !playing && <TouchableOpacity style={styles.playButtonOverlay} onPress={() => setPlaying(true)} />
                  )}
              </View>
          );
      }

      return (
        <View style={{width: '100%', height: '100%'}}>
            {videoLoading && !videoError && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.blue} />
                </View>
            )}
            <Video
                source={{ uri: uri }}
                style={styles.mediaVideo}
                muted={!showControls}
                repeat={isLoop}
                resizeMode="contain"
                paused={!showControls ? false : false} 
                controls={showControls} 
                onLoad={() => setVideoLoading(false)}
                onError={(e: any) => {
                    console.log("Video Error:", e);
                    setVideoError(true);
                    setVideoLoading(false);
                }}
            />
            {videoError && (
                <View style={styles.errorOverlay}>
                    <Text style={{color: 'white', textAlign: 'center'}}>Không thể tải video.</Text>
                </View>
            )}
        </View>
      );
  };

  const renderMediaContent = () => {
    if (activeTab === 'muscle') {
        return (
            <Image 
                source={
                    exercise.muscle_image 
                    ? { uri: exercise.muscle_image } 
                    : require('../../assets/muscle_placeholder.png')
                } 
                style={styles.mediaImage} 
                resizeMode="contain" 
            />
        );
    }
    
    if (activeTab === 'instruction' && exercise.instruction_video) {
        return renderVideoPlayer(exercise.instruction_video, false, false, true);
    }

    if (exercise.video_path) {
        return renderVideoPlayer(exercise.video_path, true, true, false);
    } 
    
    return (
        <View style={{flex:1, justifyContent: 'center', alignItems: 'center'}}>
             <Text style={{color: '#999'}}>Không có video minh họa</Text>
        </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
            <Text style={styles.headerTitle}>{exercise.name?.toUpperCase()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Image source={require('../../assets/close.png')} style={{width: 24, height: 24, tintColor: '#999'}} /> 
            </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 100}}>
            
            {/* MEDIA AREA */}
            <View style={styles.mediaContainer}>
                <Animated.View style={{ flex: 1, opacity: fadeAnim, width: '100%', height: '100%' }}>
                    {renderMediaContent()}
                </Animated.View>
            </View>

            {/* TABS */}
            <View style={styles.tabContainer}>
                <Animated.View 
                    style={[
                        styles.slidingIndicator, 
                        { transform: [{ translateX: slideAnim }] }
                    ]} 
                />

                {(['animation', 'muscle', 'instruction'] as const).map((tab, index) => {
                    const labels = { animation: 'Hoạt hình', muscle: 'Cơ bắp', instruction: 'Hướng dẫn' };
                    const isActive = activeTab === tab;
                    return (
                        <TouchableOpacity 
                            key={tab} 
                            style={styles.tabBtn}
                            onPress={() => handleTabChange(tab, index)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.tabText, 
                                isActive && styles.tabTextActive 
                            ]}>
                                {labels[tab]}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* CONTENT DETAILS */}
            <View style={styles.content}>
                
                <Text style={styles.sectionTitle}>LẦN LẶP LẠI</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
                     <Text style={styles.repsText}>
                        {exercise.type === 'time' 
                            ? formatTime(exercise.time) 
                            : `x${exercise.reps}`
                        }
                     </Text>
                </View>

                <Text style={styles.sectionTitle}>HƯỚNG DẪN</Text>
                <Text style={styles.descText}>
                    {exercise.instruction && exercise.instruction.trim() !== ""
                        ? exercise.instruction 
                        : "Chưa có hướng dẫn chi tiết cho bài tập này."}
                </Text>

                <Text style={[styles.sectionTitle, {marginTop: 20}]}>VÙNG TẬP TRUNG</Text>
                <View style={styles.tagsContainer}>
                    {focusTags.length > 0 ? (
                        focusTags.map((tag: string, index: number) => (
                            <View key={index} style={styles.tag}>
                                <View style={[styles.dot, { backgroundColor: colors.blue }]} />
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={{color: colors.subText, fontStyle: 'italic'}}>Chưa cập nhật vùng tập trung</Text>
                    )}
                </View>

            </View>
        </ScrollView>

        <View style={styles.footer}>
            <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => {
                    if (onAddToSelection) onAddToSelection(exercise.id);
                    onClose();
                }}
            >
                <Text style={styles.addButtonText}>THÊM</Text>
            </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#000' },
  closeBtn: { padding: 5 },
  mediaContainer: {
    width: width,
    height: width * 0.7, 
    backgroundColor: '#000', 
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden'
  },
  mediaVideo: { width: '100%', height: '100%' }, 
  mediaImage: { width: '100%', height: '100%', backgroundColor: '#F5F7FA' },
  videoWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  playButtonOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  touchBlocker: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', zIndex: 20 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1 },
  errorOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2, padding: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F2F4F8', margin: TAB_MARGIN, borderRadius: 25, padding: TAB_PADDING, position: 'relative', height: 50 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20, zIndex: 1 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  slidingIndicator: { position: 'absolute', top: 4, left: 4, width: TAB_WIDTH, height: '100%', backgroundColor: '#007AFF', borderRadius: 20 },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#007AFF', marginBottom: 10, textTransform: 'uppercase' },
  repsText: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  descText: { fontSize: 16, color: '#4B5563', lineHeight: 24 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 10, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  tagText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
  addButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

// ✅ ĐÃ SỬA: Export đúng tên Component mới
export default ExerciseInfoModal;