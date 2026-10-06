import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SignInPage } from './pages/SignInPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentHome } from './pages/StudentHome';
import { ReportIssueStep1 } from './pages/ReportIssueStep1';
import { ReportIssueStep2 } from './pages/ReportIssueStep2';
import { ReportSuccess } from './pages/ReportSuccess';
import { StudentGrievanceDetail } from './pages/StudentGrievanceDetail';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { GrievanceCellDashboard } from './pages/GrievanceCellDashboard';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { OfficerTicketDetail } from './pages/OfficerTicketDetail';
import { GrievanceCellTicketDetail } from './pages/GrievanceCellTicketDetail';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { api } from './services/api';
import { AiAnalysisResponse, Grievance, NotificationItem } from './types';
import { UploadedFileState } from './components/PhotoUploader';

function MainApp() {
  const { user, isLoading } = useAuth();

  // Navigation State
  const [authView, setAuthView] = useState<'signin' | 'register'>('signin');
  const [studentTab, setStudentTab] = useState<'home' | 'report' | 'alerts' | 'profile'>('home');

  // Report Flow State
  const [reportStep, setReportStep] = useState<1 | 2 | 3>(1);
  const [prefilledCategory, setPrefilledCategory] = useState<string | undefined>();
  const [currentAnalysis, setCurrentAnalysis] = useState<AiAnalysisResponse | null>(null);
  const [reportedDescription, setReportedDescription] = useState('');
  const [reportedLocation, setReportedLocation] = useState('');
  const [reportedPhotos, setReportedPhotos] = useState<UploadedFileState[]>([]);
  const [createdGrievance, setCreatedGrievance] = useState<Grievance | null>(null);

  // Detail view state
  const [selectedGrievanceId, setSelectedGrievanceId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Live notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin text-primary">progress_activity</span>
        <span className="text-[14px] font-medium text-secondary">Loading CampusFix AI...</span>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col">
        {authView === 'signin' ? (
          <SignInPage onNavigateRegister={() => setAuthView('register')} />
        ) : (
          <RegisterPage onNavigateLogin={() => setAuthView('signin')} />
        )}
      </div>
    );
  }

  // Handler for starting report flow from home
  const handleStartReport = (category?: string) => {
    setPrefilledCategory(category);
    setReportStep(1);
    setCurrentAnalysis(null);
    setSelectedGrievanceId(null);
    setStudentTab('report');
  };

  // Handler for opening ticket detail
  const handleSelectGrievance = (publicId: string) => {
    setSelectedGrievanceId(publicId);
  };

  const handleBackFromDetail = () => {
    setSelectedGrievanceId(null);
  };

  const handleReturnHome = () => {
    setSelectedGrievanceId(null);
    setShowAnalytics(false);
    setReportStep(1);
    setStudentTab('home');
  };

  const isStaff = user.role === 'OFFICER' || user.role === 'GRIEVANCE_CELL' || user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Top Header */}
      <Header
        title={selectedGrievanceId ? 'Ticket Details' : undefined}
        showBack={!!selectedGrievanceId || (studentTab === 'report' && reportStep > 1) || showAnalytics}
        onBack={() => {
          if (showAnalytics) {
            setShowAnalytics(false);
          } else if (selectedGrievanceId) {
            setSelectedGrievanceId(null);
          } else if (studentTab === 'report' && reportStep === 2) {
            setReportStep(1);
          } else {
            handleReturnHome();
          }
        }}
        notifications={notifications}
        onOpenNotifications={() => {
          setSelectedGrievanceId(null);
          setShowAnalytics(false);
          setStudentTab('alerts');
        }}
        onNavigateHome={handleReturnHome}
        onNavigateProfile={() => {
          setSelectedGrievanceId(null);
          setShowAnalytics(false);
          setStudentTab('profile');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-16 px-4 md:px-8 max-w-7xl mx-auto flex flex-col">
        {/* STUDENT FLOW */}
        {user.role === 'STUDENT' && (
          <>
            {/* If inspecting a specific grievance */}
            {selectedGrievanceId ? (
              <StudentGrievanceDetail
                publicId={selectedGrievanceId}
                onBack={handleBackFromDetail}
              />
            ) : studentTab === 'report' ? (
              /* Report Flow */
              reportStep === 1 ? (
                <ReportIssueStep1
                  initialCategory={prefilledCategory}
                  onAnalysisComplete={(analysis, desc, loc, photos) => {
                    setCurrentAnalysis(analysis);
                    setReportedDescription(desc);
                    setReportedLocation(loc);
                    setReportedPhotos(photos);
                    setReportStep(2);
                  }}
                  onCancel={handleReturnHome}
                />
              ) : reportStep === 2 && currentAnalysis ? (
                <ReportIssueStep2
                  analysis={currentAnalysis}
                  originalDescription={reportedDescription}
                  originalLocation={reportedLocation}
                  photos={reportedPhotos}
                  onSubmissionSuccess={(created) => {
                    setCreatedGrievance(created);
                    setReportStep(3);
                    fetchNotifications();
                  }}
                  onBackToEdit={() => setReportStep(1)}
                />
              ) : reportStep === 3 && createdGrievance ? (
                <ReportSuccess
                  grievance={createdGrievance}
                  onTrackComplaint={(publicId) => {
                    setSelectedGrievanceId(publicId);
                    setStudentTab('home');
                  }}
                  onReturnHome={handleReturnHome}
                />
              ) : (
                <ReportIssueStep1
                  onAnalysisComplete={() => {}}
                  onCancel={handleReturnHome}
                />
              )
            ) : studentTab === 'alerts' ? (
              <NotificationsPage
                notifications={notifications}
                onRefresh={fetchNotifications}
                onTrackComplaint={(publicId) => setSelectedGrievanceId(publicId)}
                onReportClick={() => handleStartReport()}
              />
            ) : studentTab === 'profile' ? (
              <ProfilePage />
            ) : (
              <StudentHome
                onReportClick={handleStartReport}
                onSelectGrievance={handleSelectGrievance}
              />
            )}

            {/* Mobile Bottom Navigation */}
            <BottomNav
              currentTab={studentTab}
              onSelectTab={(tab) => {
                setSelectedGrievanceId(null);
                if (tab === 'report') {
                  handleStartReport();
                } else {
                  setStudentTab(tab);
                }
              }}
              unreadCount={notifications.filter((n) => !n.read).length}
            />
          </>
        )}

        {/* STAFF & GRIEVANCE CELL FLOW */}
        {isStaff && (
          <>
            {showAnalytics ? (
              <AnalyticsPage onBack={() => setShowAnalytics(false)} />
            ) : selectedGrievanceId ? (
              user.role === 'OFFICER' ? (
                <OfficerTicketDetail
                  publicId={selectedGrievanceId}
                  onBack={handleBackFromDetail}
                />
              ) : (
                <GrievanceCellTicketDetail
                  publicId={selectedGrievanceId}
                  onBack={handleBackFromDetail}
                />
              )
            ) : studentTab === 'alerts' ? (
              <NotificationsPage
                notifications={notifications}
                onRefresh={fetchNotifications}
                onTrackComplaint={(publicId) => setSelectedGrievanceId(publicId)}
                onReportClick={() => {}}
              />
            ) : studentTab === 'profile' ? (
              <ProfilePage />
            ) : user.role === 'OFFICER' ? (
              <OfficerDashboard onSelectGrievance={handleSelectGrievance} />
            ) : (
              <GrievanceCellDashboard
                onSelectGrievance={handleSelectGrievance}
                onNavigateAnalytics={() => setShowAnalytics(true)}
              />
            )}

            {/* Mobile Bottom Bar for Staff as well */}
            <BottomNav
              currentTab={studentTab}
              onSelectTab={(tab) => {
                setSelectedGrievanceId(null);
                setShowAnalytics(false);
                setStudentTab(tab);
              }}
              unreadCount={notifications.filter((n) => !n.read).length}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
