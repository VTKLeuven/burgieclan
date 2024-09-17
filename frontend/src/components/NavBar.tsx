'use client'

export default function NavBar() {

    return (
        <>
            <div className="h-[8vh] bg-white flex">
                <div className="w-[10%] flex items-center justify-center">
                    <img src="/images/logos/vtk-logo-black.svg" alt="VTK Logo"/>
                </div>
                <div className="w-[20%] flex items-center justify-center">
                    <h4>Search</h4>
                </div>
                <div className="w-[25%] flex items-center justify-center"></div>
                <div className="w-[12%] flex items-center justify-center">
                    <h4>Jouw opleiding</h4>
                </div>
                <div className="w-[12%] flex items-center justify-center">
                    <h4>Nav-item</h4>
                </div>
                <div className="w-[12%] flex items-center justify-center">
                    <h4>Nav-item</h4>
                </div>
                <div className="w-[3%] flex items-center justify-center">
                    <h4>m</h4>
                </div>
                <div className="w-[3%] flex items-center justify-center">
                    <h4>pf</h4>
                </div>
                <div className="w-[3%] flex items-center justify-center">
                    <h4>NL</h4>
                </div>
            </div>
        </>
    )
}