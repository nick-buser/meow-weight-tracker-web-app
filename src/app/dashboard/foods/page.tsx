import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { AddFoodForm } from "~/app/dashboard/foods/_components/add-food-form";
import { FoodList } from "~/app/dashboard/foods/_components/food-list";

export default function FoodsPage() {
    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div>
                <h1 className="mb-4 text-2xl font-bold">Foods</h1>
                <FoodList />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Add a food</CardTitle>
                    <CardDescription>
                        Calories are per gram of the food as fed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AddFoodForm />
                </CardContent>
            </Card>
        </div>
    );
}
