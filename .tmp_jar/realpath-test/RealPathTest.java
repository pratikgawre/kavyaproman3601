import java.nio.file.*;
import java.nio.file.attribute.*;

public class RealPathTest {
  public static void main(String[] args) throws Exception {
    Path p = Paths.get(args[0]);
    System.out.println("path=" + p);
    System.out.println("exists=" + Files.exists(p));
    try {
      System.out.println("real=" + p.toRealPath());
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
