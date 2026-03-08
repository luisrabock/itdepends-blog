import { getAllPostsMeta } from "@/lib/posts";
import PostList from "@/components/PostList";
import SearchBar from "@/components/SearchBar";
import HomeCount from "@/components/HomeCount";
export default function Home() {
  const ptPosts = getAllPostsMeta("pt-BR");
  const enPosts = getAllPostsMeta("en");

  return (
    <div>
      <HomeCount count={ptPosts.length} />
      <SearchBar />
      <PostList posts={{ "pt-BR": ptPosts, en: enPosts }} />
    </div>
  );
}
