import React, { useState, useEffect } from "react";
import "./sidebar.css";
import { ApiClient } from "@/utils/api";

const Sidebar = () => {
  const [personalSubjects, setPersonalSubjects] = useState<string[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<string[]>([]);
  const [allPrograms, setAllPrograms] = useState<string[]>([]);

  const [isPersonalOpen, setIsPersonalOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isProgramsOpen, setIsProgramsOpen] = useState(false);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const personalSubjectsData = await ApiClient(
          "GET",
          "/api/personal-subjects"
        );
        setPersonalSubjects(personalSubjectsData);

        const favoriteItemsData = await ApiClient(
          "GET",
          "/api/users/{id}/favorites"
        );
        setFavoriteItems(favoriteItemsData);

        const allProgramsData = await ApiClient("GET", "/api/programs");
        setAllPrograms(allProgramsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Toggle sections
  const toggleSection = (
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setter((prev) => !prev);
  };

  return (
    <div className="sidebar">
      {/* Personal Subjects */}
      <div className="sidebar-section">
        <div
          className="sidebar-header"
          onClick={() => toggleSection(setIsPersonalOpen)}
        >
          <h3>Personal Subjects</h3>
          <span>{isPersonalOpen ? "-" : "+"}</span>
        </div>
        {isPersonalOpen && (
          <ul className="sidebar-list">
            {personalSubjects.map((subject, index) => (
              <li key={index}>{subject}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Favorite Items */}
      <div className="sidebar-section">
        <div
          className="sidebar-header"
          onClick={() => toggleSection(setIsFavoritesOpen)}
        >
          <h3>Favorite Items</h3>
          <span>{isFavoritesOpen ? "-" : "+"}</span>
        </div>
        {isFavoritesOpen && (
          <ul className="sidebar-list">
            {favoriteItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      {/* All Programs */}
      <div className="sidebar-section">
        <div
          className="sidebar-header"
          onClick={() => toggleSection(setIsProgramsOpen)}
        >
          <h3>All Programs</h3>
          <span>{isProgramsOpen ? "-" : "+"}</span>
        </div>
        {isProgramsOpen && (
          <ul className="sidebar-list">
            {allPrograms.map((program, index) => (
              <li key={index}>{program}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
