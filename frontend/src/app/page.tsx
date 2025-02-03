'use client'

import NavBar from "@/components/NavBar";
import CoursePage from "@/components/CoursePage";
import { Breadcrumb } from "@/types";
import Header from '@/components/header/Header'

export default function App() {

    const breadcrumb: Breadcrumb = {
        breadcrumb: ["Bachelor", "Hoofdrichting computerwetenschappen", "Toegepaste discrete algebra"]
    }

  return (
      <>
          <Header isAuthenticated={true}/>
          <div className="flex flex-1 relative">
              <div className="hidden md:block w-[5%] bg-wireframe-lightest-gray"></div>

              <div className="flex-1">
                  <CoursePage courseId={6} breadcrumb={breadcrumb}/>
              </div>
          </div>
      </>
  );
}
