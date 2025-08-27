import React from 'react';
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { 
  FaHome as HomeIcon, 
  FaFileUpload as FileUploadIcon, 
  FaTable as TableColumnIcon, 
  FaUser as AdminIcon
} from 'react-icons/fa';
import logo from 'src/assets/logo.png';
import { useUserRole } from 'src/context/UserRoleContext';
import './styles.css';

const Layout = ({user, signOut}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userRole, isAdmin } = useUserRole();

    return (
      <div className="show-fake-browser sidebar-page" style={{ height: "100vh", width: "100vw", padding: 0, margin: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%" }}>
          {/* Full-width navbar at top */}
          <div
            className="main-navbar"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: "80px", /* Increased height to accommodate larger text */
              zIndex: 120,
              backgroundImage: "url('https://images.unsplash.com/photo-1729575846511-f499d2e17d79?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YmFja2dyb3VuZCUyMHdlYnNpdGV8ZW58MHx8MHx8fDA%3D')",
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              width: "100%",
              position: "relative"
            }}
          >
            {/* Dark overlay for better text readability */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.6)",
              zIndex: 1
            }}></div>
            
            <div style={{ display: "flex", justifyContent: "space-between", height: "100%", alignItems: "center", padding: "0 24px", position: "relative", zIndex: 5 }}>
              <div style={{ display: "flex", alignItems: "center", position: "relative", zIndex: 10 }}>
                <img src={logo} alt="AWS" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                <div style={{ marginLeft: "12px", position: "relative", zIndex: 10 }}>
                  <div style={{ fontWeight: 700, color: "white", lineHeight: 1.3, fontSize: "18px", textShadow: "1px 1px 3px rgba(0,0,0,0.7)" }}>
                    Secure Shield<br/>
                    <span style={{ color: "white", fontSize: "16px", fontWeight: 600 }}>Personally Identifiable Information (PII) Redaction</span>
                  </div>
                </div>
              </div>
              
              {/* User info and sign out */}
              <button 
                onClick={signOut}
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "white",
                  boxShadow: "none",
                  border: "none",
                  borderRadius: "30px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 10
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    backgroundColor: "#ffffff",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <AdminIcon size={12} color="#4CAF50" />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "white" }}>
                      {user && (user.given_name || user.family_name) ? 
                        `${user.given_name || ''} ${user.family_name || ''}`.trim() : 
                        (user.username ? user.username.split('@')[0] : 'User')}
                    </div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}>
                      {userRole === 'admin' ? 'Admin Access' : 'Standard Access'} | Sign Out
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          {/* Sidebar below navbar */}
          <div
            className="simple-sidebar"
            style={{
              position: "fixed",
              top: "80px", /* Increased to match new navbar height */
              left: 0,
              height: "calc(100vh - 80px)", /* Adjusted for new navbar height */
              display: "flex",
              flexDirection: "column",
              zIndex: 110,
              backgroundColor: "#ffffff",
              borderRight: "1px solid #e0e0e0",
              width: "250px"
            }}
          >
            {/* Sidebar Links */}
            <div className="simple-sidebar-menu" style={{ padding: "10px 0 0 0", width: "100%" }}>
              {/* Home */}
              <div
                className={location.pathname === "/" ? "simple-menu-item active" : "simple-menu-item"}
                onClick={() => navigate("/")}
              >
                <HomeIcon size={20} color={location.pathname === "/" ? "#4CAF50" : "#616161"} />
                <span className="menu-text">Home</span>
              </div>
              
              {/* Process Documents */}
              <div
                className={location.pathname.startsWith("/process") ? "simple-menu-item active" : "simple-menu-item"}
                onClick={() => navigate("/process")}
              >
                <FileUploadIcon size={20} color={location.pathname.startsWith("/process") ? "#4CAF50" : "#616161"} />
                <span className="menu-text">Process Documents</span>
              </div>
              
              {/* Analysis Jobs */}
              <div
                className={location.pathname.startsWith("/review") ? "simple-menu-item active" : "simple-menu-item"}
                onClick={() => navigate("/review")}
              >
                <TableColumnIcon size={20} color={location.pathname.startsWith("/review") ? "#4CAF50" : "#616161"} />
                <span className="menu-text">Analysis Jobs</span>
              </div>
            </div>
          </div>

          {/* Main Content Container */}
          <main
            className="main-content"
            style={{
              marginTop: "80px", /* Increased to match new navbar height */
              marginLeft: "250px",
              padding: "24px",
              backgroundColor: "#f8f9fc",
              height: "calc(100vh - 80px)", /* Adjusted for new navbar height */
              overflow: "auto",
              width: "calc(100% - 250px)"
            }}
          >
            <Outlet context={{ userRole }} />
          </main>
        </div>
      </div>
    );
}

export default Layout;
