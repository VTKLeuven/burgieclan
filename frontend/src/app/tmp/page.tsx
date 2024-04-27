import Button from "@/components/button/Button";
import SolidButton from "@/components/button/SolidButton";

/**
 * This is a temporary component to test the button component
 */
export default function Page() {
    return(
        <>
            <div className="w-screen h-screen flex justify-center items-center">
                <Button>Normal button</Button>
                <SolidButton>Solid button</SolidButton>
            </div>
        </>
    )
}