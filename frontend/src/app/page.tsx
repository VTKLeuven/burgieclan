import NavBar from "@/components/NavBar";
import CoursePage from "@/components/CoursePage";

export default function App() {
  return (
      <>
          <NavBar/>
          <div className="flex flex-1 relative">
              <div className="w-[5%] bg-wireframe-lightest-gray"></div>

              <div className="flex-1">
                  <CoursePage/>
              </div>
          </div>
      </>
  );
}
