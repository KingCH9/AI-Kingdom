import { NextResponse } from "next/server";

import { getStores } from "@/lib/queries/stores";



export async function GET() {

  try {

    const stores = await getStores();

    return NextResponse.json(stores);

  } catch (error) {

    console.error("GET STORES ERROR:", error);



    return NextResponse.json(

      { error: "Failed to load stores" },

      { status: 500 }

    );

  }

}



/** Orphan store creation is deprecated — stores are created by Forge during build tasks. */

export async function POST() {

  return NextResponse.json(

    {

      success: false,

      message:

        "Direct store creation is deprecated. Stores are created automatically when Forge completes a build-store task.",

    },

    { status: 410 }

  );

}

