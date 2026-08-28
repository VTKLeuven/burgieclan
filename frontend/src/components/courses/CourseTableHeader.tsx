export const CourseTableHeader = () => (
    <div className="grid grid-cols-12 bg-vtk-paper-2 py-2 px-3 text-sm font-medium border-b leading-tight" role="row">
        <div className="col-span-5" role="columnheader">Name</div>
        <div className="col-span-1" role="columnheader">Code</div>
        <div className="col-span-1 text-center" role="columnheader">Credits</div>
        <div className="col-span-2 text-center" role="columnheader">Semester</div>
        <div className="col-span-2 text-center" role="columnheader">Professors</div>
        <div className="col-span-1 text-right" role="columnheader"><span className="sr-only">Actions</span></div>
    </div>
);