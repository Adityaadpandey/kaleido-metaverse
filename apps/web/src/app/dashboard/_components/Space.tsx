"use client";

import { Card } from "@/components/ui/card";
import axios from "axios";
import {
  LucideLoader2,
  LucidePlus,
  LucideRocket,
  LucideTrash2,
  LucideX,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Space {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  width: number;
  height: number;
  depth: number;
  backgroundImage: string;
  gravity: number;
  lightingTheme: string;
  owner?: {
    displayName: string;
    id: string;
  };
  _count: {
    userPresences: number;
  };
}

interface NewSpaceForm {
  name: string;
  description: string;
  isPublic: boolean;
  width: number;
  height: number;
  depth: number;
  backgroundImage: string;
  gravity: number;
  lightingTheme: string;
}

const SpacePage = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [newSpace, setNewSpace] = useState<NewSpaceForm>({
    name: "",
    description: "",
    isPublic: true,
    width: 10,
    height: 10,
    depth: 10,
    backgroundImage: "",
    gravity: 9.8,
    lightingTheme: "default",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  // Fetch all public spaces
  useEffect(() => {
    fetchPublicSpaces();
  }, []);

  const fetchPublicSpaces = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/space/public`);
      console.log(res.data.spaces);
      setSpaces(res.data.spaces);
    } catch (err) {
      setError("Failed to fetch public spaces. Please try again later.");
    }
    setLoading(false);
  };

  // Fetch a single space by ID
  const fetchSpaceById = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/space/${id}`);
      setSelectedSpace(res.data.space);
    } catch (err) {
      setError("Space not found or you don't have permission to view it.");
    }
    setLoading(false);
  };

  // Create a new space
  const createSpace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSpace.name.trim()) {
      setError("Space name is required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (!token) {
        setError("You must be logged in to create a space");
        setLoading(false);
        return;
      }

      await axios.post(`${API_URL}/space`, newSpace, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMessage("Space created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      setNewSpace({
        name: "",
        description: "",
        isPublic: true,
        width: 10,
        height: 10,
        depth: 10,
        backgroundImage: "",
        gravity: 9.8,
        lightingTheme: "default",
      });

      setShowCreateForm(false);
      fetchPublicSpaces();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to create space. Please try again.",
      );
    }
    setLoading(false);
  };

  // Delete a space
  const deleteSpace = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this space? This action cannot be undone.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (!token) {
        setError("You must be logged in to delete a space");
        setLoading(false);
        return;
      }

      await axios.delete(`${API_URL}/space/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMessage("Space deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      if (selectedSpace?.id === id) {
        setSelectedSpace(null);
      }

      fetchPublicSpaces();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to delete space. Please try again.",
      );
    }
    setLoading(false);
  };

  return (
    <Card className="max-w-6xl mx-auto p-6 my-5">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LucideRocket />
            <span>Space Manager</span>
          </h1>

          <button
            className=" px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? (
              <>
                <LucideX size={18} />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <LucidePlus size={18} />
                <span>New Space</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Space List */}
        <div className={`${selectedSpace ? "lg:col-span-1" : "lg:col-span-2"}`}>
          <div className="rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Public Spaces</h2>

            {loading && !spaces.length ? (
              <div className="flex justify-center items-center py-12">
                <LucideLoader2
                  className="animate-spin text-blue-500"
                  size={32}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {spaces.length === 0 ? (
                  <p className=" text-center py-8">
                    No public spaces available
                  </p>
                ) : (
                  spaces.map((space) => (
                    <div
                      key={space.id}
                      className={`border rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors ${
                        selectedSpace?.id === space.id
                          ? "border-blue-500"
                          : "border-gray-200"
                      } ${loading ? "opacity-50" : ""}`}
                      onClick={() => fetchSpaceById(space.id)}
                    >
                      <h3 className="font-bold text-lg">{space.name}</h3>
                      <p className=" text-sm mb-3 line-clamp-2">
                        {space.description || "No description"}
                      </p>

                      <div className="flex justify-between items-center">
                        <div className="flex space-x-1 text-xs">
                          <span className="px-2 py-1 rounded">
                            {space.width}×{space.height}×{space.depth}
                          </span>
                          {space.lightingTheme !== "default" && (
                            <span className="px-2 py-1 rounded">
                              {space.lightingTheme}
                            </span>
                          )}
                        </div>

                        <button
                          className="text-red-500 hover:text-red-700 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSpace(space.id);
                          }}
                        >
                          <LucideTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Details or Create Form */}
        <div className={`${selectedSpace ? "lg:col-span-2" : "lg:col-span-1"}`}>
          {showCreateForm ? (
            <div className=" rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Create New Space</h2>

              <form onSubmit={createSpace}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium  mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      placeholder="My Awesome Space"
                      value={newSpace.name}
                      onChange={(e) =>
                        setNewSpace({ ...newSpace, name: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="Describe your space..."
                      value={newSpace.description}
                      onChange={(e) =>
                        setNewSpace({
                          ...newSpace,
                          description: e.target.value,
                        })
                      }
                      className="w-full p-2 border  rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Width
                      </label>
                      <input
                        type="number"
                        value={newSpace.width}
                        onChange={(e) =>
                          setNewSpace({
                            ...newSpace,
                            width: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border  rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Height
                      </label>
                      <input
                        type="number"
                        value={newSpace.height}
                        onChange={(e) =>
                          setNewSpace({
                            ...newSpace,
                            height: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border  rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Depth
                      </label>
                      <input
                        type="number"
                        value={newSpace.depth}
                        onChange={(e) =>
                          setNewSpace({
                            ...newSpace,
                            depth: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gravity
                      </label>
                      <input
                        type="number"
                        value={newSpace.gravity}
                        onChange={(e) =>
                          setNewSpace({
                            ...newSpace,
                            gravity: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lighting Theme
                      </label>
                      <select
                        value={newSpace.lightingTheme}
                        onChange={(e) =>
                          setNewSpace({
                            ...newSpace,
                            lightingTheme: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="default">Default</option>
                        <option value="dark">Dark</option>
                        <option value="neon">Neon</option>
                        <option value="sunset">Sunset</option>
                        <option value="daylight">Daylight</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium  mb-1">
                      Background Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      value={newSpace.backgroundImage}
                      onChange={(e) =>
                        setNewSpace({
                          ...newSpace,
                          backgroundImage: e.target.value,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={newSpace.isPublic}
                      onChange={(e) =>
                        setNewSpace({ ...newSpace, isPublic: e.target.checked })
                      }
                      className="h-4 w-4  border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isPublic"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Public Space
                    </label>
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      type="button"
                      className=" text-gray-800 mr-2 px-4 py-2 rounded-md  transition-colors"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md  transition-colors flex items-center gap-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <LucideLoader2 className="animate-spin" size={18} />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <LucidePlus size={18} />
                          <span>Create Space</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : selectedSpace ? (
            <div className=" rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{selectedSpace.name}</h2>
                <button onClick={() => setSelectedSpace(null)} className="">
                  <LucideX size={20} />
                </button>
              </div>

              {selectedSpace.backgroundImage && (
                <div className="mb-6 rounded-lg overflow-hidden h-48 ">
                  <img
                    src={selectedSpace.backgroundImage}
                    alt={selectedSpace.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-medium  mb-1">Description</h3>
                <p className="">
                  {selectedSpace.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium mb-1">Dimensions</h3>
                  <div className="flex gap-2">
                    <div className=" px-3 py-2 rounded-md flex items-center">
                      <span className="font-medium mr-2">W:</span>{" "}
                      {selectedSpace.width}
                    </div>
                    <div className=" px-3 py-2 rounded-md flex items-center">
                      <span className="font-medium mr-2">H:</span>{" "}
                      {selectedSpace.height}
                    </div>
                    <div className="  px-3 py-2 rounded-md flex items-center">
                      <span className="font-medium mr-2">D:</span>{" "}
                      {selectedSpace.depth}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium  mb-1">Physics</h3>
                  <div className="px-3 py-2 rounded-md inline-flex items-center">
                    <span className="font-medium mr-2">Gravity:</span>{" "}
                    {selectedSpace.gravity}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium  mb-1">Lighting</h3>
                <div className="px-3 py-2 rounded-md inline-flex items-center">
                  {selectedSpace.lightingTheme}
                </div>
              </div>

              {selectedSpace.owner && (
                <div className="border-t pt-4 mt-6">
                  <h3 className="text-sm font-medium  mb-1">Owner</h3>
                  <p className="">{selectedSpace.owner.displayName}</p>
                </div>
              )}

              <div className="flex justify-between items-center mt-8">
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      selectedSpace.isPublic
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedSpace.isPublic ? "Public" : "Private"}
                  </span>
                  <br />
                  {/* <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                        {selectedSpace?._count?.userPresences} Users
                                    </span> */}
                </div>

                <button
                  onClick={() => deleteSpace(selectedSpace.id)}
                  className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors"
                >
                  <LucideTrash2 size={16} />
                  <span>Delete Space</span>
                </button>
              </div>
            </div>
          ) : (
            <div className=" rounded-lg shadow-md p-6 flex flex-col items-center justify-center h-full min-h-64">
              <LucideRocket className="mb-4" size={48} />
              <h3 className="text-xl font-medium mb-2">Select a Space</h3>
              <p className=" text-center">
                Choose a space from the list to view its details
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-6  px-4 py-2 rounded-md  transition-colors flex items-center gap-2"
              >
                <LucidePlus size={18} />
                <span>Create New Space</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SpacePage;
