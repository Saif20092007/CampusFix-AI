import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ToastContainer, ToastMessage } from './components/Toast';
import { NotFoundPage } from './components/NotFoundPage';
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
import { TopLeftDemoButton } from './components/TopLeftDemoButton';

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
  const [isNotFound, setIsNotFound] = useState(false);

  // Live notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Toast feedback state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Dynamic Document Title sync
  useEffect(() => {
    if (!user) {
      document.title =
        authView === 'signin'
          ? 'Sign In | CampusFix AI — College Grievance Management'
          : 'Register Student Account | CampusFix AI';
      return;
    }
    if (isNotFound) {
      document.title = '404 Page Not Found | CampusFix AI';
    } else if (showAnalytics) {
      document.title = 'Analytics & SLA Performance | CampusFix AI';
    } else if (selectedGrievanceId) {
      document.title = `Ticket Details #${selectedGrievanceId} | CampusFix AI`;
    } else if (studentTab === 'report') {
      document.title = `Report Campus Issue (Step ${reportStep}) | CampusFix AI`;
    } else if (studentTab === 'alerts') {
      document.title = 'Notifications & Alerts | CampusFix AI';
    } else if (studentTab === 'profile') {
      document.title = 'Campus Registry Profile | CampusFix AI';
    } else {
      document.title =
        user.role === 'STUDENT'
          ? 'Student Portal | CampusFix AI'
          : user.role === 'OFFICER'
          ? 'HOD Department Queue | CampusFix AI'
          : 'Central Grievance Triage | CampusFix AI';
    }
  }, [user, authView, isNotFound, showAnalytics, selectedGrievanceId, studentTab, reportStep]);

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
      <div className="min-h-screen bg-surface text-on-surface flex flex-col relative overflow-x-hidden">
        <TopLeftDemoButton />
        {authView === 'signin' ? (
          <SignInPage onNavigateRegister={() => setAuthView('register')} />
        ) : (
          <RegisterPage onNavigateLogin={() => setAuthView('signin')} />
        )}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Handler for starting report flow from home
  const handleStartReport = (category?: string) => {
    setIsNotFound(false);
    setPrefilledCategory(category);
    setReportStep(1);
    setCurrentAnalysis(null);
    setSelectedGrievanceId(null);
    setShowAnalytics(false);
    setStudentTab('report');
  };

  // Handler for opening ticket detail
  const handleSelectGrievance = (publicId: string) => {
    setIsNotFound(false);
    setSelectedGrievanceId(publicId);
  };

  const handleBackFromDetail = () => {
    setSelectedGrievanceId(null);
    setIsNotFound(false);
  };

  const handleReturnHome = () => {
    setSelectedGrievanceId(null);
    setShowAnalytics(false);
    setIsNotFound(false);
    setReportStep(1);
    setStudentTab('home');
  };

  const isStaff = user.role === 'OFFICER' || user.role === 'GRIEVANCE_CELL' || user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col overflow-x-hidden">
      {/* Top Header */}
      <Header
        title={
          selectedGrievanceId
            ? 'Ticket Details'
            : showAnalytics
            ? 'Analytics'
            : isNotFound
            ? '404 Not Found'
            : undefined
        }
        showBack={!!selectedGrievanceId || (studentTab === 'report' && reportStep > 1) || showAnalytics || isNotFound}
        onBack={() => {
          if (isNotFound) {
            handleReturnHome();
          } else if (showAnalytics) {
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
          setIsNotFound(false);
          setSelectedGrievanceId(null);
          setShowAnalytics(false);
          setStudentTab('alerts');
        }}
        onNavigateHome={handleReturnHome}
        onNavigateProfile={() => {
          setIsNotFound(false);
          setSelectedGrievanceId(null);
          setShowAnalytics(false);
          setStudentTab('profile');
        }}
        onNavigateAnalytics={() => {
          setIsNotFound(false);
          setSelectedGrievanceId(null);
          setShowAnalytics(true);
        }}
        onNavigateReport={user.role === 'STUDENT' ? () => handleStartReport() : undefined}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-16 px-4 md:px-8 max-w-7xl mx-auto flex flex-col pb-24 sm:pb-12">
        {/* Custom 404 View */}
        {isNotFound ? (
          <NotFoundPage
            onReturnHome={handleReturnHome}
            onReportIssue={user.role === 'STUDENT' ? () => handleStartReport() : undefined}
          />
        ) : (
          <>
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
                        addToast('info', 'AI diagnostic completed. Please review.');
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
                        addToast('success', `Complaint #${created.display_no} created successfully!`);
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

                {/* Mobile Bottom Navigation for Students */}
                <BottomNav
                  currentTab={studentTab}
                  onSelectTab={(tab) => {
                    setSelectedGrievanceId(null);
                    setIsNotFound(false);
                    if (tab === 'report') {
                      handleStartReport();
                    } else {
                      setStudentTab(tab);
                    }
                  }}
                  unreadCount={notifications.filter((n) => !n.read).length}
                  isStaff={false}
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

                {/* Mobile Bottom Bar for Staff */}
                <BottomNav
                  currentTab={studentTab}
                  onSelectTab={(tab) => {
                    setSelectedGrievanceId(null);
                    setShowAnalytics(false);
                    setIsNotFound(false);
                    setStudentTab(tab);
                  }}
                  unreadCount={notifications.filter((n) => !n.read).length}
                  isStaff={true}
                  showAnalytics={showAnalytics}
                  onSelectAnalytics={() => {
                    setSelectedGrievanceId(null);
                    setIsNotFound(false);
                    setShowAnalytics(true);
                  }}
                />
              </>
            )}
          </>
        )}
      </main>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
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
