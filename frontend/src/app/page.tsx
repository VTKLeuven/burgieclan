import NavBar from "@/components/NavBar";
import CoursePage from "@/components/CoursePage";
import { Course, Breadcrumb } from "@/types";

export default function App() {
    const course: Course = {
        name: "Analyse, deel 1",
        professors: [
            ["Stefan", "Vandewalle", true],
            ["Stefan", "Vandewalle", true],
            ["Lutgarde", "Beernaert", false],
            ["Lutgarde", "Beernaert", false],
            ["Raf", "Vandebril", false],
            ["Raf", "Vandebril", false]
        ],
        courseCode: "H01A0B",
        credits: 6,
        location: "KU Leuven",
        description_top: "Lorem ipsum dolor sit amet consectetur. At orci quis morbi vulputate nibh interdum lectus quam nec. Ipsum feugiat viverra justo consectetur. Odio commodo aliquet elit.",
        description_bottom: "Lorem ipsum dolor sit amet consectetur. At orci quis morbi vulputate nibh interdum lectus quam nec. Ipsum feugiat viverra justo consectetur. Odio commodo aliquet elit auctor vulputate in fames condimentum leo. Venenatis amet ullamcorper pharetra congue arcu at non mi quam."
    };

    const breadcrumb: Breadcrumb = {
        breadcrumb: ["Bachelor", "Gemeenschappelijke basis", "Wiskunde", "Analyse, deel 1"]
    }

  return (
      <>
          <NavBar/>
          <div className="flex flex-1 relative">
              <div className="w-[5%] bg-wireframe-lightest-gray"></div>

              <div className="flex-1">
                  <CoursePage course={course} breadcrumb={breadcrumb}/>
              </div>
          </div>
      </>
  );
}
